ATomTool (att) – verpflichtende CLI für CI/Review

Grundsatz:
- Verwende für CI-Status/Anzeige und Copilot-Review-Orchestrierung ausschließlich die CLI `att` (Alias: `gatt`).
- Keine direkten `gh run watch` / `gh api` / custom one-off bash loops, außer `att` ist nicht verfügbar.

CI:
- Live UI (modern): `att ui <runId|runUrl>` oder `att push` (push + auto-run-detect + UI)
- Metadaten (JSON): `att status`

Copilot Review (phase-sicher):
- Phase markieren:
  - `att review mark --phase initial`
  - `att review mark --phase final`
- Status prüfen (ohne harte Fehler-Exits): `att review status --phase <initial|final> --json`
- Warten bis Review fertig: `att review wait --phase <initial|final> --timeout 900 --interval 10`
- Review-Queue lesen:
  - nur Copilot + nur unresolved + nur unacked:
    `att review queue --phase <initial|final> --copilot-only --unresolved-only --unacked-only`
- Nach Umsetzung eines Threads: sichtbarer ACK-Kommentar in der PR:
  `att review ack --thread <THREAD_ID> --sha <COMMIT_SHA> --note "Umgesetzt; bitte prüfen."`
