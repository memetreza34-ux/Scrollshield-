# ScrollShield - Soft-Launch & Beta-Rollout Plan

Dieser Plan definiert die Phasen für die Markteinführung von ScrollShield. Die oberste Maxime lautet: **Die erste öffentliche Version (v1.0) muss klein, extrem stabil und in ihrer Kommunikation glasklar sein.** Features wie Cloud-Sync, Partner-Control oder komplexe Abos bleiben vorerst deaktiviert, bis das Kernprodukt fehlerfrei läuft.

---

## Phase 1: Interne Alpha-Version (Dogfooding)
**Ziel:** Grundlegende technische Stabilität und "Happy Path"-Prüfung.
**Tester:** Kernteam, Entwickler, Designer und enge Freunde (ca. 5-10 Personen).

*   **Fokus:** Lässt sich die App installieren, starten und das Onboarding abschließen?
*   **Test von leeren Zuständen (Empty States):** Wie sieht das Dashboard am ersten Tag aus, wenn noch keine Statistiken oder Verläufe existieren? Sind die Platzhalter motivierend und verständlich?
*   **Test von Reset- und Löschfunktionen:** Funktioniert der "App auf Werkseinstellungen zurücksetzen"-Button zuverlässig? Werden wirklich alle lokalen `localStorage`-Daten gelöscht, ohne dass die App abstürzt?

## Phase 2: Geschlossene Beta (Technical Beta)
**Ziel:** Plattformspezifische Eigenheiten und Edge-Cases unter realen Bedingungen testen.
**Tester:** 20-50 ausgewählte Nutzer (z.B. via TestFlight für iOS und Google Play Internal Testing für Android).

*   **Test von Android und iOS getrennt:** 
    *   *iOS:* Funktioniert die Screen Time API zuverlässig? Werden die kritischen Benachrichtigungen zugestellt?
    *   *Android:* Funktioniert das Overlay zuverlässig über anderen Apps? Wird der Nutzungsdatenzugriff korrekt ausgewertet?
*   **Test von Berechtigungsflüssen:** Verstehen die Tester, *warum* sie bestimmte Berechtigungen erteilen müssen? Brechen sie das Onboarding ab? Funktioniert die App (mit Einschränkungen) weiter, wenn Berechtigungen verweigert werden?
*   **Sammeln von Feedback (Technisch):** Fokus auf Abstürze, UI-Glitches und Akkuverbrauch.

## Phase 3: Soft-Launch (Test mit wenigen echten Nutzern)
**Ziel:** Prüfung der User Retention (Bleiben die Nutzer?) und des echten Mehrwerts.
**Tester:** 100-500 echte Nutzer aus einer spezifischen Zielgruppe (z.B. ein Reddit-Forum für Produktivität/ADHS) oder einem kleinen Testmarkt (z.B. nur Österreich/Schweiz).

*   **Test von Fokusmodus, Regeln, Verlauf und Statistiken:**
    *   Ergeben die Statistiken nach 3-7 Tagen Nutzung Sinn?
    *   Ist der Fokusmodus zu streng oder zu leicht zu umgehen?
    *   Wird der Verlauf (History) korrekt aufgezeichnet (Blockierungen, Notfallfreigaben)?
*   **Sammeln von Feedback (Qualitativ):** 
    *   Aktive Nutzung der "Feedback senden"- und "Problem melden"-Buttons im neuen Support-Screen.
    *   Versand einer kurzen Umfrage nach 7 Tagen Nutzung: "Hilft dir ScrollShield, deine Bildschirmzeit bewusster zu gestalten?"

## Phase 4: Release Candidate (RC) & Öffentlicher Launch
**Ziel:** Finaler Feinschliff und Freigabe für den globalen App Store / Play Store.

### Kriterien für den Release Candidate (Go/No-Go):
1.  **Stabilität:** Crash-free Rate von > 99% in der Soft-Launch-Phase.
2.  **Berechtigungen:** Keine "Dead Ends" (Sackgassen) im Berechtigungsfluss auf beiden Plattformen.
3.  **Kernversprechen erfüllt:** Die Verzögerungs- und Einschränkungsmechanismen funktionieren zuverlässig (Best-Effort bei Reels/Shorts ist transparent kommuniziert).
4.  **Rechtliches & Store:** Impressum, Datenschutzerklärung und Store-Texte sind final geprüft und entsprechen der Realität (keine falschen Versprechen).
5.  **Support-Readiness:** Das Postfach `support@scrollshield.app` wird aktiv überwacht.

**Launch-Strategie:**
Sobald der RC die Kriterien erfüllt, wird die App öffentlich geschaltet. Marketing-Maßnahmen werden erst 1-2 Wochen *nach* dem öffentlichen Launch hochgefahren, um sicherzustellen, dass die Server (falls genutzt) und die App-Logik der Last standhalten.

---
*Hinweis: Premium-Features (Paywall) werden erst in Phase 5 (Post-Launch, v1.1 oder v1.2) aktiviert, sobald eine solide, zufriedene Nutzerbasis aufgebaut wurde.*
