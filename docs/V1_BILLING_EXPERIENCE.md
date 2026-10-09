# V1 Billing – Architektur, Abonnements und Paywall-Erlebnis

**Stand:** 2026-10-09 · **Implementierungsstatus:** kein produktives Billing. Diese Spezifikation ist ein Release-Gate und **kein** Beleg für vorhandene Käufe.

## 1. Fairer Pro-Wert und Freemium-Vertrag

**Free dauerhaft:** 2 Apps, Öffnungspause, Sanft/Ausgewogen, Basis-Reopen, 1 Zeitplan, Fokus 15/30/60, Emergency Unlock, ehrliche Heute-Metriken und keine Werbung.

**Pro laufender Mehrwert:** unbegrenzte Apps, erweiterte Reopen-Eskalation, Session Guard, Tagesbudgets, beliebig viele Zeitpläne, Stark/Eigene, Rescue, strenger/custom Fokus, Wochen-Einblicke.

Nutzer dürfen Free ohne Konto oder Trial nutzen. Erste Paywall **beim 3.-App-Versuch** bzw. bei explizit gewähltem Pro-Feature, nie in Onboarding oder Emergency Unlock. Kein Drängen, kein „Du verlierst deinen Fortschritt“, keine verschwiegene Probeverlängerung.

**Planungsziel:** 3,99 €/Monat / 24,99 €/Jahr / 7 Tage Jahres-Trial. Diese Werte niemals als bestätigte öffentliche Angebote hartkodieren. Produktkonfiguration, lokalisierter Endpreis, Probephase und Erneuerungsdetails kommen aus Google Play.

## 2. Nutzeransicht der Paywall

Oben: **„Mehr schützen mit Pro“**; eine Zeile erklärt den konkreten Auslöser (z. B. „Du möchtest eine dritte App schützen“). Danach nicht mehr als vier verständliche Vorteile und eine sichtbare Free-Alternative.

Planwahl: **Monatlich** und **Jährlich**, jeweiliger **voller Abrechnungsbetrag**; Jahresersparnis nur mathematisch korrekt und wenn von lokalisierten Store-Angeboten ableitbar. Bei Trial: „7 Tage kostenlos, anschließend X €/Jahr; automatische Verlängerung bis Kündigung“ und der Zeitpunkt/Verwaltungsweg klar erkennbar.

Unmittelbar beim Kaufbutton: Preis, Abrechnungsintervall, Trial-Ende/Automatik, Hinweise zu Kündigung. Links zu Datenschutzerklärung, Bedingungen und **Abo verwalten** ohne Suche.

Unterhalb/oben sichtbar: **„Kostenlos weiternutzen“**. Kaufabschluss nur über authentischen Google-Play-Billing-Flow. Kein Button mit Kaufvorgang, wenn Play-Verbindung oder Produktangebot fehlt.

### Grundsätzliche Zustände

| Zustand | Sichtbares UI | Access |
| --- | --- | --- |
| `loading` | „Angebote werden geladen“ und Retry nach Timeout | Free |
| `available` | echte Monats-/Jahrespreise, Trial nur wenn konkret angeboten | Free bis bestätigter Kauf |
| `unavailable` / Store offline | „Abos momentan nicht verfügbar“, Free bleibt uneingeschränkt | Free |
| `purchasing` | ein laufender Kauf, mehrfaches Antippen gesperrt | Free |
| `pending` | „Zahlung wird bearbeitet“, Status erneuern | **kein Pro** |
| `cancelled` vor Kauf | neutral zurück auf Free/Paywall ohne Fehlermeldung | Free |
| `verifiedActive` | „Pro aktiv“, Ablauf/Verwaltungslink | Pro |
| `trialVerified` | „Testphase aktiv“, Ende + folgende Verlängerung offenlegen | Pro |
| `grace` | nur gemäß verifizierter Google-Play-Lifecycle-Information, Status transparent | entsprechend expliziter Entitlement-Regel |
| `onHold` / `expired` / `refunded` / `revoked` | „Abo nicht aktiv“, erneute Prüfung/Verwaltung | Free; keine Pro-Regeln mehr |
| `verificationUncertain` | „Status wird geprüft“ mit begrenzter, definierter Offline-Strategie | niemals unbegrenzt Pro aufgrund lokalem Flag |

## 3. Datenmodell und vertrauenswürdige Architektur

```
React Paywall
    ↓
Billing Adapter (Capacitor / Android, typisiert)
    ↓
Google Play Billing Library (ProductDetails/OfferToken)
    ↓
Kaufzustand / Purchase Token
    ↓
Vertrauenswürdige Verifikation (Server oder geprüfter Entitlement-Dienst)
    ↓
Signierter/gesicherter Entitlement-Status + Ablauf
    ↓
FeatureAccessService
    ├── React-Screens / Paywall
    └── Native Protection Rule Builder / Kotlin-Sync
```

**Keine** Google-Play-API-Secrets in APK oder React-Bundle. Der Native/Frontend-Client darf keinen Kauf ausschließlich anhand lokal gespeicherter Daten freischalten.

**Architekturentscheidung vor Implementierung (SS-401):** Android Billing direkt plus **schlankes Backend** zur Tokenverifikation **oder** geprüfter Entitlement-Dienst. Bewerten: laufende Gebühren, Datenschutz, Datentransfer, Wiederherstellung ohne Account, Webhooks/RTDN, Updatepflichten, Google-Play-Policy. Nicht automatisch Firebase/RevenueCat hinzufügen.

V1 ist ansonsten lokal-first; der **Billing-Verifikationsdienst ist eine begrenzte Ausnahme** und wird transparent erklärt. Keine Nutzungsprotokolle oder geschützten Apps an den Billing-Dienst senden.

## 4. Lifecycle-Matrix für Entwicklung und Tests

1. Monats-Abo erfolgreich gekauft: Google bestätigt `PURCHASED`, Backend verifiziert, Acknowledge, Pro aktiv.
2. Jahres-Abo mit qualifiziertem Trial: Trial-Angebot exakt wie in Google Play, nach Überprüfung Pro aktiv, Verlängerungsbedingungen korrekt.
3. Kauf abgebrochen oder Store nicht verfügbar: kein Pro, kein kaputter Free-Schutz.
4. `PENDING`: keine Pro-Freischaltung vor bestätigter Zahlung.
5. Restore nach Reinstall/Device-Wechsel: bestehendes gültiges Abo wiederherstellen, kein zweite Kaufzwang.
6. Abo gekündigt, aber noch bezahlte Restlaufzeit: Zugangsende gemäß verifiziertem Ablauf, kein vorzeitiges Entfernen.
7. Zahlung gescheitert, Grace/Account Hold: exakt nach überprüfter Play-Policy/Status.
8. Erstattung, Rückbuchung, Widerruf, endgültiger Ablauf: Entitlement entziehen; Free-App-Konfiguration erhalten.
9. Google-Play-Verbindung offline: kontrollierter Status, begrenzte Offline-Grace nur bei zuvor **verifiziertem** Kauf.
10. Zwei parallele Geräte / Kauf außerhalb der App: Reconciliation/Restore prüft gleiche Play-Zuordnung.
11. Doppeltap, verlorener Callback, App-Kill während Kauf: idempotente Verarbeitung, Retry ohne Doppelgrant.
12. Preis-/Länderwechsel/Trial nicht verfügbar: nur tatsächliches `ProductDetails`-Angebot zeigen.
13. Google-Play-Entwicklerkonto ohne hinterlegte Produkte: Paywall zeigt „Abos noch nicht verfügbar“, niemals Platzhalter-Kauf.
14. Missbrauchsfall: importierte `pro.active=true`-Datei, Debug-Preview in Release, manipulierte Store-Daten → **kein Pro**.

## 5. Downgrade ohne Ärger

Wenn verifiziertes Pro ausläuft:

- höchstens zwei zuvor ausgewählte Free-Apps dürfen weiter aktiv durchgesetzt werden.
- Pro-Session-Guards, Zusatz-Zeitpläne, strenge Reopen-Parameter und Custom-Fokus dürfen **nicht** ungeprüft nativ weiterlaufen.
- gespeicherte Konfigurationen bleiben als **deaktivierte Einstellungen** erhalten, nicht löschen oder überschreiben.
- UI erklärt „Dein Abo ist ausgelaufen. Zwei Apps bleiben geschützt.“; Auswahl der beiden Free-Apps ermöglichen.
- Schutz-Engine übernimmt neuen Snapshot deterministisch; keine Phantomregeln in Kotlin und kein unerwarteter App-Lockout.
- Bei erneuter verifizierter Aktivierung individuelle Pro-Regeln kontrolliert wiederherstellen.

**Technischer Akzeptanztest:** Native-Sync für 5 aktive Apps + 3 Zeitpläne + Pro Custom mit entzogenem Entitlement ergibt exakt die Free-Regeln (ohne die gespeicherten Pro-Werte zu zerstören). Dasselbe für Fokus/Rescue/Commitment.

## 6. Datensicherheit und Support

- Kaufnachweise sind vertraulich und sollen nicht im Log oder Nutzer-Export landen.
- Verifikation minimaler Daten: erforderliches Kauf-Token, Produkt-/Abo-Zuordnung, Ablaufstatus; keine geschützten App-Pakete und keine Nutzungsstatistik.
- Datenschutztext und Google Play Data Safety anhand des gewählten Dienstes aktualisieren.
- Öffentliche Support-Adresse für „Kauf nicht erkannt“, „Restore“, „Kündigung“ und „Erstattung“.
- Keine eigene Karten-/Bankdatenerfassung.
- Benötigte Play Console Produkte, Base Plans, Offers, Tester, Google-Play-API-/Webhooks-Zugänge gehören zu **Owner-Blockern** und werden nicht erfunden.

## 7. Engineering-Abnahme

- Getypte Adapter-Schnittstelle mit `queryOffers()`, `purchase(offerToken)`, `restore()`, `getEntitlement()`, `openManagement()`.
- Kein Klick über der nativen Google-Kaufinstanz.
- App-Verifikation statt lokalem Boolean.
- FeatureAccessService einziger Pro-Zugangsstandard für UI und Native.
- Versionierte Cache-/Offline-Politik; Fall `entitlementUnknown` sichtbar, Free bleibt funktionsfähig.
- Mocks nur für isolierte Tests; Produktions-App niemals auf Mock-Entitlement.
- Lizenztester durchlaufen die 14 Lifecycle-Szenarien; Screenshots/Logs ohne Tokens dokumentieren.
- Kauf- und Datensicherheitsrichtlinien: https://developer.android.com/google/play/billing/integrate und https://support.google.com/googleplay/android-developer/answer/9900533.

**Bis verifizierte Käufe, Restore, Trial und Revocation laufen, bleibt die Kaufaktion in der Production-Build deaktiviert.**
