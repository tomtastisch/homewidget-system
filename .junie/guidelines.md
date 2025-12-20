# Richtlinien für umzusetzenden Code (Tomtastisch)

Ziel: Produktiv nutzbarer, wartbarer Code mit stabilen Schnittstellen, klarer Schichtentrennung und konsistenter
In-Code-Dokumentation.

## Architektur und Design

- Produktiv nutzbarer, klar strukturierter Code; kein Demo-/Script-Stil.
- Klare Trennung von:
    - Kernlogik/Domäne,
    - I/O sowie UI/Framework,
    - Konfiguration und Infrastruktur.
- Kleine, fokussierte Funktionen/Klassen; Komposition vor Vererbung; keine „God Objects“ und keine Methoden mit zu
  vielen Zuständigkeiten.
- Orientierung an bestehender Architektur/Modulen; öffentliche APIs stabil halten.
- Neue Features bevorzugt intern integrieren; keine zusätzlichen `if`/`else`-Pflegeketten beim Aufrufer erzwingen.

## Konfiguration und Infrastruktur

- Konfigurierbares Verhalten (z. B. Headless, Scaling, Ziele, Pfade, Parameter) über Funktions-/Konstruktorparameter,
  Config-Objekte oder Environment-Variablen.
- Fachliche Parameter nicht hartkodieren; keine Magic Numbers (insbesondere keine `+1`/`−1`-Inkremente ohne fachliche
  Begründung).

## Typen und Fehlerbehandlung

- Präzise Typen verwenden; keine untypisierten Sammelparameter.
- Verallgemeinerungen bei Typen und Fehlern vermeiden (sprachübergreifend): keine generischen Top-Typen oder
  Sammel-Exceptions (z. B. `Any`/`object`/`unknown`/`Error`/`Exception`) als Standard in Kernlogik oder öffentlichen
  APIs.
- Stattdessen: präzise Typen, domänenspezifische Fehlerklassen oder Result-Typen; bewusstes Fehler-Mapping an
  Boundary-Schichten (I/O, Framework).
- Fehlerbehandlung mit spezifischen Exception-Typen und klaren Fehlermeldungen; kein pauschales `except Exception` ohne
  triftigen Grund.
- Kein `sys.exit()` in Kernlogik.

## Code-Style und Benennung

- Sprechende, konsistente Namen.
- Möglichst geringe Komplexität pro Funktion; Redundanz vermeiden.

### Python-spezifisch (falls Python-Code betroffen)

- PEP-8-konformer Stil:
    - `snake_case` für Funktionen/Variablen,
    - CapWords für Klassen,
    - 4 Leerzeichen Einrückung, keine Tabs.
- Konsequente Nutzung von Typannotationen (inkl. `from __future__ import annotations`) mit präzisen Typen aus `typing`.

## In-Code-Dokumentation (Deutsch)

- Kommentare, Docstrings/JSDoc und sonstige In-Code-Dokumentation sind grundsätzlich auf Deutsch zu verfassen.
- Ausnahmen nur, wenn externe Spezifikationen/APIs/Protokolle explizit englische Bezeichnungen oder standardisierte
  Meldungen vorgeben (z. B. RFC-konforme Konstanten, HTTP-Header, standardisierte Fehlermeldungen).
- Öffentliche Module/Klassen/Funktionen mit präzisen, deutschen Docstrings/JSDoc (Zweck, Parameter, Rückgabewerte,
  Besonderheiten).
- Bei inhaltlichen Änderungen (Verhalten, Signaturen, Randfälle) sind zugehörige In-Code-Beschreibungen auf Aktualität
  zu prüfen und an das neue Verhalten anzupassen; veraltete oder widersprüchliche Texte entfernen.
- Stil: kompakt, explizit, code-nah; keine direkte Ansprache (`du`, `wir`), keine Unsicherheitsmarker (`wahrscheinlich`,
  `vermutlich`), keine Floskeln als Einleitung (z. B. „Hinweis“, „Info“).
- Kommentare nur für nicht offensichtliche Aspekte (z. B. Numerik, Geometrie, Zustandsmaschinen, Threading/Concurrency,
  komplexe Algorithmen); keine Codebeispiele, kein Pseudocode, keine How-To-Anleitungen.

## Logging

- Logging über Standard-Logging des jeweiligen Stacks; kein `print()` in Produktivcode.
- Fokus auf relevante Ereignisse: Fehler/Warnungen, wichtige Statuswechsel, gezielte Debug-Information.

## Nebenläufigkeit und Robustheit

- Nebenläufigkeit (`threading`, `concurrent.futures`, `asyncio` oder Äquivalente) nur gezielt einsetzen.
- Gemeinsam genutzter Zustand wird synchronisiert oder über immutable Strukturen/Message-Passing gehandhabt; keine
  stillen Race-Conditions.
- Vermeidung von Endlosschleifen, Stagnation und „Hängern“ durch klare Abbruchkriterien (Konvergenz, Toleranzen,
  Zustandsüberwachung), nicht nur durch Timer-Notabschaltungen.

## Algorithmik und Simulation (falls zutreffend)

- Physikalisch/algorithmisch plausibles Verhalten mit korrekten Einheiten sowie sauberer Winkel-/Vektorgeometrie.
- Klare Kriterien für Zustände wie „Landung/Crash“ oder äquivalente domänenspezifische Zustandswechsel.

## Tests und Qualität

- Testbare Struktur: Kernlogik frameworkfrei halten; Unit-Tests und Black-Box-Tests ohne spezielle Hacks ermöglichen.
- Tests deterministisch und schnell; bestehende Tests müssen bestehen.

### Python-spezifisch (falls Python-Tests betroffen)

- `pytest`-kompatible Tests (Dateinamen `test_*.py`, `assert`-basierte Checks).

## Sicherheit und Abhängigkeiten

- Keine Secrets (Passwörter, Tokens, API-Keys, personenbezogene Daten) im Code.
- Eingaben validieren, bevor sie in Kernlogik, DB oder OS-Operationen fließen.
- Keine sensiblen Daten im Logging.
- Für Auth/Krypto/Netzwerk nur etablierte, geprüfte Bibliotheken; keine Eigenbau-Kryptographie.
- Externe Abhängigkeiten minimal und bewusst wählen:
    - Standardbibliothek/Standard-Frameworkmittel bevorzugen,
    - zusätzliche Libraries nur bei klarem technischem Mehrwert,
    - kein „Library-Zoo“ für triviale Hilfsfunktionen.

## Projekt-Dokumentation außerhalb des Codes

- Keine neuen Markdown-Dokumentationsdateien während der Umsetzung anlegen; Projekt-/Architektur-Dokumentation außerhalb
  des Codes (Markdown) erst nach Finalisierung erstellen bzw. konsolidieren.

## Erlaubte Variationen

Innerhalb dieser Grenzen sind verschiedene Stile (funktional vs. objektorientiert, alternative Algorithmen) erlaubt,
solange:

- Lesbarkeit und Wartbarkeit verbessert werden,
- fachliches Verhalten korrekt und plausibel bleibt,
- Tests bestehen und
- bestehende öffentliche APIs nicht ohne Not gebrochen werden.

## Arbeitsmethodik: Push-to-Green und verbindliche Commands

Ziel: Jede Phase gilt erst als FINISH, wenn die Remote-CI vollständig grün ist.

### Verbindliche Command-Policy (Junie MUSS diese verwenden)

1) Push & CI-Warten (Pflicht)

- Statt `git push` ist für jeden Push ausschließlich zu verwenden:
    - `gh ci-push`
- Erwartung: Der Command blockiert bis CI “completed” ist und liefert Exit-Code:
    - 0 = SUCCESS
    - != 0 = FAILURE/CANCELLED/TIMEOUT

2) Status-Entscheidungen (maschinenlesbar, Pflicht)

- Für deterministische Status-Abfragen (keine UI-Auswertung):
    - `ci-status-json`
- Optional (für humans / Visualisierung):
    - `ci-dashboard`

3) Diagnose bei Failure (Pflicht – ohne Spekulation)

- `./tools/ci/ci-last-failed-log.sh`
- `./tools/ci/ci-download-artifacts-last-run.sh`
- Danach: konkrete Fix-To-dos ableiten (Datei + Änderung + Verifikation).

4) System-Installationen (Pflicht)

- Systemtools ausschließlich via Homebrew installieren (falls benötigt).
- Keine zusätzlichen Tool-Alternativen einführen (pro Zweck genau ein Weg).

### Phasenmodell (generisch, verbindlich)

Für jedes Ticket:

- Phase planen → umsetzen → `gh ci-push` → warten bis grün.
- Nur wenn grün: Phase als FINISH markieren.
- Danach: offene Phasenliste ggf. aktualisieren (wegen neuen Erkenntnissen) und erst dann nächste Phase starten.
- Bei Failure: Diagnose (nur Logs) → Fix → wieder `gh ci-push` → erst bei grün weiter.

### Stop-Condition

- Wenn Ursache nicht eindeutig aus Logs/Artifacts belegbar ist: STOP und exakt sagen, welche Info fehlt.

