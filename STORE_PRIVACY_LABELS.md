# ScrollShield – App Store Privacy & Data Safety Guide

Dieses Dokument ist die interne Vorlage, um die Formulare für **Apple App Privacy Details** (App Store Connect) und **Google Play Data safety** (Google Play Console) korrekt, konsistent und wahrheitsgemäß auszufüllen.

Da die Definition von "Datenerhebung" (Data Collection) bei Apple und Google bedeutet, dass Daten das Gerät verlassen und an Server gesendet werden, ist das Ausfüllen für unsere v1.0 extrem simpel.

---

## 1. Aktuelle Offline-Version (v1.0 MVP)

Für die erste Release-Version gilt das Prinzip der **lokalen Verarbeitung**.

*   **Werden Daten erhoben (Collected)?** NEIN. (Daten verlassen das Gerät nicht).
*   **Werden Daten geteilt (Shared)?** NEIN.
*   **Werden Daten für Tracking genutzt?** NEIN.
*   **Sind Daten mit dem Nutzer verknüpft?** NEIN. (Es gibt keinen Account).

### So füllst du die Formulare für v1.0 aus:
*   **Apple App Store:** Wähle aus, dass deine App **keine** Daten von Nutzern sammelt. (Du musst keine weiteren Details angeben).
*   **Google Play Store:** Wähle aus, dass deine App **keine** Nutzerdaten erhebt oder teilt.

---

## 2. Zukünftige Online-Version (v2.0+ mit Cloud-Sync & Login)

Sobald die Feature-Flags für Cloud-Sync und Accounts aktiviert werden, ändern sich die Angaben. Hier ist die detaillierte Aufschlüsselung für die Zukunft:

### A. Datentypen & Zweck
1.  **Persönliche Daten (E-Mail-Adresse / Name)**
    *   *Erhebung:* Ja (bei Registrierung).
    *   *Zweck:* App-Funktionalität (Account-Verwaltung).
    *   *Nutzerverknüpfung:* Ja.
    *   *Tracking:* Nein.
2.  **App-Aktivität (Nutzungshistorie, Blockaden, Regeln)**
    *   *Erhebung:* Ja (nur bei aktiviertem Cloud-Sync).
    *   *Zweck:* App-Funktionalität (Geräteübergreifende Synchronisation).
    *   *Nutzerverknüpfung:* Ja (mit dem Account verknüpft).
    *   *Tracking:* Nein.
3.  **Geräte- oder andere IDs (Firebase Installation IDs)**
    *   *Erhebung:* Ja (durch Firebase SDK).
    *   *Zweck:* App-Funktionalität, Analytics (optional).
    *   *Nutzerverknüpfung:* Nein (pseudonymisiert).
    *   *Tracking:* Nein.

### B. Drittanbieter-SDKs (Third-Party)
*   **Firebase Authentication:** Erhebt E-Mail-Adressen und Auth-Token zur Nutzerauthentifizierung.
*   **Firestore (Datenbank):** Speichert die synchronisierten App-Regeln und Historien.
*   *Wichtig für Google Play:* Firebase verschlüsselt Daten "in transit" (HTTPS).

### C. Tracking (Apple's Definition)
*   **Definition:** Tracking bedeutet, Nutzerdaten mit Daten von anderen Unternehmen zu verknüpfen, um zielgerichtete Werbung (Targeted Ads) zu schalten oder Profile an Datenbroker zu verkaufen.
*   **ScrollShield Status:** **STRIKTES NEIN.** Weder in v1.0 noch in v2.0. Wir schalten keine Werbung und verkaufen keine Daten.

---

## 3. Checkliste für Store-Angaben (Data Safety)

Wenn du die Formulare ausfüllst, halte dich an diese Wahrheiten:
- [x] Daten werden über eine sichere Verbindung übertragen (HTTPS) -> *Ja (sobald Cloud aktiv).*
- [x] Nutzer können die Löschung ihrer Daten beantragen -> *Ja (In-App-Reset und Account-Löschung).*
- [x] Daten werden für Tracking genutzt -> *Nein.*
- [x] Daten werden mit Dritten geteilt -> *Nein.*

## 4. Technische Umsetzung in der App
Die App ist bereits so gebaut, dass sie diese Angaben stützt:
1.  Der `AppState` wird in v1.0 ausschließlich im `localStorage` des Browsers/WebViews gehalten.
2.  Die Firebase-Initialisierung ist vorhanden, wird aber für die Kernfunktionen des MVPs nicht zwingend benötigt, solange der Nutzer sich nicht aktiv einloggt.
3.  Die In-App-Datenschutzerklärung spiegelt exakt diese Offline-First-Architektur wider.
