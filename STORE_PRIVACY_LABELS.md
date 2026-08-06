# ScrollShield – App Store Privacy & Data Safety Guide

Dieses Dokument ist die interne Vorlage, um die Formulare für **Apple App Privacy Details** (App Store Connect) und **Google Play Data safety** (Google Play Console) korrekt, konsistent und wahrheitsgemäß auszufüllen.

Da die Definition von "Datenerhebung" (Data Collection) bei Apple und Google bedeutet, dass Daten das Gerät verlassen und an Server gesendet werden, ist das Ausfüllen für unsere v1.0 extrem simpel.

---

## 1. Aktuelle Offline-Version (v1.0 MVP)

Für die erste Release-Version gilt das Prinzip der **lokalen Verarbeitung**.

- **Werden Daten erhoben (Collected)?** NEIN. (Daten verlassen das Gerät nicht).
- **Werden Daten geteilt (Shared)?** NEIN.
- **Werden Daten für Tracking genutzt?** NEIN.
- **Sind Daten mit dem Nutzer verknüpft?** NEIN. (Es gibt keinen Account).

### So füllst du die Formulare für v1.0 aus:

- **Apple App Store:** Wähle aus, dass deine App **keine** Daten von Nutzern sammelt. (Du musst keine weiteren Details angeben).
- **Google Play Store:** Wähle aus, dass deine App **keine** Nutzerdaten erhebt oder teilt.

---

## 2. Zukünftige Online-Version (nicht Bestandteil von v1.0)

Cloud-Sync und Accounts sind deaktiviert und es werden keine Firebase-Pakete ausgeliefert. Vor einer späteren Aktivierung
müssen diese Angaben anhand der dann tatsächlich verwendeten SDKs vollständig neu geprüft werden.

### A. Datentypen & Zweck

1.  **Persönliche Daten (E-Mail-Adresse / Name)**
    - _Erhebung:_ Ja (bei Registrierung).
    - _Zweck:_ App-Funktionalität (Account-Verwaltung).
    - _Nutzerverknüpfung:_ Ja.
    - _Tracking:_ Nein.
2.  **App-Aktivität (Nutzungshistorie, Blockaden, Regeln)**
    - _Erhebung:_ Ja (nur bei aktiviertem Cloud-Sync).
    - _Zweck:_ App-Funktionalität (Geräteübergreifende Synchronisation).
    - _Nutzerverknüpfung:_ Ja (mit dem Account verknüpft).
    - _Tracking:_ Nein.
3.  **Geräte- oder andere IDs (Firebase Installation IDs)**
    - _Erhebung:_ Ja (durch Firebase SDK).
    - _Zweck:_ App-Funktionalität, Analytics (optional).
    - _Nutzerverknüpfung:_ Nein (pseudonymisiert).
    - _Tracking:_ Nein.

### B. Drittanbieter-SDKs (Third-Party)

- **Firebase Authentication:** Erhebt E-Mail-Adressen und Auth-Token zur Nutzerauthentifizierung.
- **Firestore (Datenbank):** Speichert die synchronisierten App-Regeln und Historien.
- _Wichtig für Google Play:_ Firebase verschlüsselt Daten "in transit" (HTTPS).

### C. Tracking (Apple's Definition)

- **Definition:** Tracking bedeutet, Nutzerdaten mit Daten von anderen Unternehmen zu verknüpfen, um zielgerichtete Werbung (Targeted Ads) zu schalten oder Profile an Datenbroker zu verkaufen.
- **ScrollShield Status:** **STRIKTES NEIN.** Weder in v1.0 noch in v2.0. Wir schalten keine Werbung und verkaufen keine Daten.

---

## 3. Antworten für Version 1.0

Wenn du die Formulare ausfüllst, halte dich an diese Aussagen:

- Daten werden vom Entwickler erhoben: **Nein**
- Daten werden mit Dritten geteilt: **Nein**
- Daten werden für Tracking genutzt: **Nein**
- Account-Erstellung: **Nicht vorhanden**
- Löschung: **Lokaler App-Reset und Deinstallation**
- Übertragungssicherheit: **Nicht anwendbar, da keine Nutzungsdaten übertragen werden**

## 4. Technische Umsetzung in der App

Die App ist bereits so gebaut, dass sie diese Angaben stützt:

1.  Der `AppState` wird in v1.0 ausschließlich im `localStorage` des Browsers/WebViews gehalten.
2.  Es werden keine Backend-, Auth-, Analytics-, Werbe- oder Crash-Reporting-SDKs ausgeliefert.
3.  `npm run check:privacy` lehnt Netzwerk-APIs und bekannte Tracker-Marker im Release-Bundle ab.
4.  Die In-App- und öffentliche Datenschutzerklärung spiegeln diese Offline-First-Architektur wider.
