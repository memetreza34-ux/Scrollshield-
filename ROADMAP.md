# ScrollShield – Produkt-Roadmap

Diese Roadmap dient als interner Leitfaden für die Weiterentwicklung von ScrollShield. Das oberste Ziel ist es, die App iterativ und stabil auszubauen, ohne den Kernwert (Fokus & Reduktion) durch Feature-Creep zu verwässern.

Die Architektur (siehe `FeatureFlags` in `src/types.ts`) ist bereits auf diese Phasen vorbereitet.

---

## Phase 1: Foundation (v1.0 – Release Candidate)
**Ziel:** Eine extrem stabile, vertrauenswürdige und lokal funktionierende App (Offline-First). Der Nutzer soll sofortigen Mehrwert spüren.

*   **Kern-Features:**
    *   Öffnungsverzögerung (Intentional Delay) als Hauptmechanik.
    *   Vorgefertigte, verständliche Schutzprofile (Sanft, Arbeit, Schlaf).
    *   Manueller Fokus-Modus (Deep Work Timer).
    *   Notfallfreigabe (Emergency Unlock) zur Frustvermeidung.
    *   Einfaches "Heute"-Dashboard (Blockaden, gesparte Zeit).
*   **Technik & Vertrauen:**
    *   100 % lokale Datenspeicherung (Privacy First).
    *   Sauberes Onboarding und transparente Berechtigungserklärung.
    *   Robuste Fehlerbehandlung (SystemHealth) bei fehlenden OS-Rechten.

---

## Phase 2: Refinement & Insights (v1.1 – v1.2)
**Ziel:** Die App wird intelligenter und bietet dem Nutzer tiefere Einblicke in sein Verhalten, bleibt aber komplett offline.

*   **UX-Verbesserungen:**
    *   Feinschliff der Animationen und Übergänge.
    *   Erweiterte Empty States und motivierende Micro-Interactions.
*   **Bessere Statistiken (`enableAdvancedStats`):**
    *   Wochen- und Monatsansichten (Balken-/Liniendiagramme).
    *   Erkennung von Trends ("Deine problematischste Zeit ist 22:00 Uhr").
    *   Streak-System visuell aufwerten.
*   **Bessere Schutzprofile:**
    *   Freischaltung des "Custom Rule Builders" (Eigene Regeln erstellen).
    *   Anti-Binge-Logik (Erkennung von "Rapid Opens" – z. B. App 5x in 10 Min. geöffnet).
    *   Ortsbasierte Profile (z. B. "Streng", wenn im Büro-WLAN).

---

## Phase 3: Connectivity (v2.0)
**Ziel:** Der Schritt in die Cloud. Nutzer können ihre Daten sichern und geräteübergreifend nutzen. Opt-in und Privacy-Fokus bleiben erhalten.

*   **Optionale Online-Funktionen (`enableCloudSync`):**
    *   Sicheres Login-System (Google, Apple, E-Mail).
    *   Ende-zu-Ende verschlüsselter Cloud-Sync (Firestore).
    *   Geräteübergreifende Synchronisation (z. B. iPhone & iPad teilen sich das Tageslimit).
    *   Cloud-Backup der Einstellungen und Historie.
*   **Architektur:**
    *   Nahtloser Übergang von lokaler Speicherung zu Cloud-Speicherung ohne Datenverlust.

---

## Phase 4: Accountability & Social (v2.5)
**Ziel:** Nutzung von sozialem Druck und gegenseitiger Unterstützung, um Gewohnheiten nachhaltig zu ändern.

*   **Accountability-Funktionen (`enablePartnerControl`):**
    *   "Partner-Modus": Teile deine täglichen Erfolge/Misserfolge automatisch mit einem Freund.
    *   "Lock my phone": Ein Partner muss die Notfallfreigabe per Push-Benachrichtigung absegnen.
*   **Familien-Basis (`enableFamilyControl`):**
    *   Eltern können Profile für Kindergeräte verwalten (Light-Version von Family Link, aber mit Fokus auf Aufklärung statt reiner Sperre).

---

## Phase 5: Premium & Intelligence (v3.0 – ScrollShield Pro)
**Ziel:** Monetarisierung durch echte Power-User-Features und KI-gestützte Verhaltensanalyse.

*   **Premium-Erweiterungen:**
    *   Unbegrenzte benutzerdefinierte Profile und Regeln.
    *   Hardcore-Modus (Erschwertes Deinstallieren oder Umgehen der App).
    *   Datenexport (CSV/PDF) für Digital-Detox-Coaches.
*   **KI-Integration (`enableAiRecommendations`):**
    *   Smart Relapse Prevention: Die App lernt, an welchen Tagen/Uhrzeiten der Nutzer am schwächsten ist, und passt die Verzögerung automatisch an (z. B. 5 Sek. am Morgen, 15 Sek. am späten Abend).
    *   Personalisierte Motivations-Zitate basierend auf dem aktuellen Verhalten.

---

## Leitlinien für die Entwicklung
1. **Niemals Phase 1 kaputt machen:** Jedes neue Feature muss optional sein. Wer die App nur als simplen Offline-Timer nutzen will, darf nicht durch Social-Features oder Paywalls genervt werden.
2. **Feature Flags nutzen:** Neue Phasen werden erst im Code über die `FeatureFlags` (in `types.ts`) entwickelt und getestet, bevor sie für den Nutzer sichtbar werden.
3. **Design-Sprache beibehalten:** Auch komplexe Statistiken (Phase 2) oder Cloud-Settings (Phase 3) müssen dem minimalistischen, ruhigen "Editorial"-Design treu bleiben.
