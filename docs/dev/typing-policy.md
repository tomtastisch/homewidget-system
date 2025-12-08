### Typing- und MyPy-Policy (homewidget-system)

Ziel: Klare, projektweite Regeln für Typannotationen und MyPy, die praxisnah sind und sicherheits-/domänenrelevante Bereiche zuverlässig prüfen. Diese Policy vermeidet globale Deaktivierungen und setzt auf explizite, lokal begründete Ausnahmen.

#### Funktionsgruppen
- Kern/Domain/Security (MUST):
  - Beispiele: `backend/app/services/**`, `backend/app/core/**`, `backend/app/models/**`
  - Inhalte: Auth, Security, Token-Handling, Rate-Limiting, DB-Schreibpfade, Domain-Logik
- Infrastruktur-/Framework-Glue (SHOULD):
  - Beispiele: `backend/app/api/**` (FastAPI-Routen), dünne Integrationsschichten
  - Inhalte: Weiterleitung an Services, Request/Response-Mapping
- Dynamische/Extern-Wrapper (MAY):
  - Beispiele: sehr dünne Adapter um dynamische Bibliotheken, generierter Code, temporäre Übergangs-Wrapper

#### Regeln
- MUST (zwingend typisieren)
  - Alle Funktionen in `backend/app/services`, `backend/app/core`, `backend/app/models` sind vollständig zu typisieren (Parameter- und Rückgabetypen, möglichst präzise Typen wie `collections.abc.Sequence` statt `list` bei reinen Lesefällen).
  - Sicherheits- und Domain-Code wird nie „ruhiggestellt“ (kein Ignore an diesen Stellen).
- SHOULD (empfohlen typisieren)
  - API-/Routing-Funktionen in `backend/app/api` sollen typisiert werden, wenn dort Logik stattfindet (z. B. Validierung, Branching, direkte DB‑Zugriffe, Fehlerbehandlung). Rückgabetypen explizit angeben, auch wenn `response_model` gesetzt ist.
- MAY (lokale Ausnahme möglich)
  - Dünne Glue-/Wrapper-Funktionen ohne eigene Logik dürfen untypisiert bleiben, wenn Typannotationen keinen Mehrwert bringen oder unpraktikabel sind. In diesen Fällen ist ein lokales, kommentiertes Ignore zulässig:
    - `def wrapper(...):  # type: ignore[annotation-unchecked]`
    - Alternativ, sehr sparsam, dateiweite Kopfzeile: `# mypy: disable-error-code="annotation-unchecked"` (nur für klar abgegrenzte Wrapper-/Adapter-Module, nicht für Services/Core/Models).

#### MyPy-Konfiguration (umgesetzt)
- In `backend/pyproject.toml`:
  - Global pragmatisch: `ignore_missing_imports = true`, keine globale Deaktivierung von `annotation-unchecked`.
  - Erzwingung der Body-Prüfung (verhindert „annotation‑unchecked“-Notes) in kritischen Bereichen:
    ```toml
    [tool.mypy."app.services.*"]
    check_untyped_defs = true

    [tool.mypy."app.core.*"]
    check_untyped_defs = true

    [tool.mypy."app.models.*"]
    check_untyped_defs = true
    ```
  - Für `app.api.*` gibt es bewusst keine globale Erzwingung; dünne Wrapper dürfen lokal ignorieren. Routen mit eigener Logik sollen typisiert werden.

#### Beispiele
- Präzise Rückgabetypen aus DB‑Reads:
  ```python
  from collections.abc import Sequence
  def list_for_user(self, user: User) -> Sequence[Widget]:
      return self.session.exec(...).all()
  ```
- Lokale Ausnahme in dünnem Wrapper:
  ```python
  def pass_through(request: Request):  # type: ignore[annotation-unchecked]
      return downstream(request)
  ```

#### Durchsetzung
- Linting/Typecheck: `bash tools/dev/quality.sh` (oder `bash tools/dev/quality.sh fix`).
- Erwartung: 
  - Ruff grün.
  - MyPy ohne Fehler.
  - Hinweise vom Typ `annotation-unchecked` nur dort, wo lokal und begründet ignoriert wurde.

#### Erweiterbarkeit
- Bei neuen Modulen die Einordnung (MUST/SHOULD/MAY) früh festlegen.
- Falls „SHOULD“-Bereiche dauerhaft untypisiert bleiben sollen, lieber in „MAY“ umwidmen und lokal dokumentieren – keine globale Deaktivierung einführen.
