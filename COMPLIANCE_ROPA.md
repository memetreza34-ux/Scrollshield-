# ScrollShield – Internes Verarbeitungsverzeichnis & Compliance (RoPA)

Dieses Dokument dient als internes, technisches Verarbeitungsverzeichnis (Record of Processing Activities / RoPA) gemäß Art. 30 DSGVO. Es dokumentiert transparent, wie ScrollShield mit Daten umgeht, und bildet die Grundlage für Datenschutzerklärungen, App-Store-Angaben und rechtliche Prüfungen.

---

## 1. Verarbeitete Datenarten

In der aktuellen Version (v1.0 Offline-MVP) verarbeitet ScrollShield folgende Daten:

- **App-Nutzungsdaten:** Welche Apps (App-IDs/Bundle-IDs) geöffnet werden.
- **Zeitstempel:** Wann eine App geöffnet, blockiert oder freigegeben wurde.
- **Statistiken:** Berechnete Fokus-Zeit, gesparte Zeit, Streaks.
- **Konfigurationsdaten:** Vom Nutzer erstellte Regeln, Profile und Limits.
- _(Zukunft / v2.0+):_ E-Mail-Adresse, Authentifizierungs-Token, Geräte-IDs (für Cloud-Sync).

## 2. Verarbeitungszwecke

Die Datenverarbeitung erfolgt **ausschließlich zur Bereitstellung der App-Funktionalität**:

- Erkennung von Impuls-Öffnungen zur Auslösung des Verzögerungs-Timers.
- Durchsetzung von vom Nutzer definierten Tageslimits und Fokus-Sitzungen.
- Visualisierung des eigenen Verhaltens (Dashboard/Statistiken) zur Selbstreflexion.
- _Kein Zweck:_ Tracking, Profiling für Werbezwecke, Verkauf an Dritte.

## 3. Speicherorte

- **Aktuell (v1.0):** 100 % lokal auf dem Endgerät des Nutzers (sichere App-Sandbox / LocalStorage / native Datenbank).
- **Zukunft (v2.0+):** Bei Opt-in für Cloud-Sync erfolgt die Speicherung in Google Firebase (Firestore). _Compliance-Ziel:_ Server-Standort Europa (z. B. `europe-west3` / Frankfurt) zwingend festlegen.

## 4. Aufbewahrungsdauer

- **Lokale Daten:** Werden unbefristet auf dem Gerät gespeichert, solange die App installiert ist, um Langzeitstatistiken zu ermöglichen.
- **Cloud-Daten (Zukunft):** Bis zur aktiven Löschung des Accounts durch den Nutzer.
- **Inaktive Accounts (Zukunft):** Geplante automatische Löschung von Cloud-Daten nach 12 Monaten Inaktivität.

## 5. Löschroutinen

Der Nutzer hat jederzeit die volle Kontrolle über seine Daten. Folgende Routinen sind in der App implementiert:

- **Granulare Löschung:** Verlauf leeren (löscht Zeitstempel), Statistiken zurücksetzen (löscht Streaks).
- **App-Reset:** Löscht alle lokalen Konfigurationen, Regeln und Historien (Hard Reset).
- **System-Löschung:** Bei Deinstallation der App löscht das Betriebssystem (iOS/Android) die lokale Sandbox automatisch und restlos.
- **Account-Löschung (Zukunft):** Ein In-App-Button löst die sofortige Löschung des Firebase-Auth-Users und der verknüpften Firestore-Dokumente aus.

## 6. Berechtigungen

Die App arbeitet nach dem Prinzip der Datenminimierung (Data Minimization). Details siehe `PERMISSION_MATRIX.md`.

- **iOS:** Screen Time API (Family Controls).
- **Android:** Nutzungsdatenzugriff (`PACKAGE_USAGE_STATS`), Überlagerung (`SYSTEM_ALERT_WINDOW`).
- _Zweckbindung:_ Diese Rechte werden ausschließlich lokal ausgewertet, um den Blockier-Screen zu triggern.

## 7. Drittanbieter-Abhängigkeiten (Third-Party)

- **Aktuell:** Keine aktiven Tracking- oder Analytics-SDKs, die Nutzungsdaten ausleiten.
- **Firebase (Google):** Das SDK ist im Code vorbereitet. Sobald Cloud-Features aktiviert werden, verarbeitet Firebase Auth (Logins) und Firestore (Daten-Sync). Google fungiert dann als Auftragsverarbeiter (AVV / DPA muss abgeschlossen werden).

## 8. Plattformspezifische Unterschiede

- **iOS:** Apple stellt die Screen Time API zur Verfügung. ScrollShield erhält hierbei _keinen_ direkten Zugriff auf die rohen Nutzungszeiten aller Apps, sondern übergibt Apple eine Liste zu blockierender Apps. Apple übernimmt das Blockieren. (Sehr hohes Datenschutzniveau).
- **Android:** ScrollShield muss die aktiven Apps selbst auslesen (`UsageStatsManager`). Hier hat die App theoretisch Zugriff auf mehr rohe Nutzungsdaten, wertet diese aber strikt nur für die konfigurierten Ziel-Apps aus und verwirft den Rest sofort im Arbeitsspeicher.

## 9. Potenzielle Risiken (Threat Modeling)

- **Physischer Zugriff:** Wenn eine unbefugte Person das entsperrte Handy des Nutzers in die Hand nimmt, kann sie im ScrollShield-Dashboard ablesen, wie oft bestimmte Apps (z. B. Dating-Apps) genutzt wurden.
- **Cloud-Leak (Zukunft):** Bei Aktivierung des Cloud-Syncs liegen sensible Verhaltensprofile (Wann nutzt jemand welche App?) in der Datenbank. Ein Datenbank-Leak wäre ein hohes Risiko.

## 10. Geplante Schutzmaßnahmen

Zur Minimierung der unter Punkt 9 genannten Risiken:

- **Privacy by Default:** Cloud-Sync bleibt standardmäßig deaktiviert (Opt-in).
- **Ende-zu-Ende-Verschlüsselung (E2EE):** Bevor App-Nutzungsdaten (Historie) in v2.0 an Firestore gesendet werden, müssen sie idealerweise lokal mit einem nutzerspezifischen Schlüssel verschlüsselt werden, sodass selbst wir als Betreiber sie nicht lesen können.
- **Biometrischer Schutz (Geplant):** Optionale App-Sperre (FaceID / Fingerabdruck) beim Öffnen von ScrollShield, um die Statistiken vor physischen Blicken zu schützen.
