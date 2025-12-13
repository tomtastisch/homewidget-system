Ziel

- Einführung eines zentralen Data-Fetching- und Caching-Layers im Frontend via TanStack Query (React Query), um
  Netzwerkzugriffe zu standardisieren und Performance sowie Robustheit zu erhöhen.

Umsetzung

- TanStack Query Provider in App-Root integriert
- Zentrale QueryClient-Konfiguration (Retry/Backoff, Cache-/Stale-Times, Refetch-Strategien)
- Einheitliche Patterns für Query Keys, Invalidations und Error-Handling
- Optionale Devtools (nur in Entwicklung)

Scope / Nicht enthalten

- Keine vollständige Migration aller bestehenden Requests (nur Basis-Setup und erste(s) Beispiel(e), falls umgesetzt)
- Keine API-Vertragsänderungen

Test

- App-Start und Kernflows (Login/Feed) manuell geprüft
- E2E/CI unverändert (sofern keine Anpassungen notwendig waren)

Hinweise

- Bestehende lokale Änderung(en) am Working Tree wurden bewusst getrennt behandelt bzw. in diesem PR enthalten (siehe
  Commits).
