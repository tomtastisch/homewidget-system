# Bekannte, akzeptierte Warnungen

Diese Datei dokumentiert Warnungen, die in der CI/Dev-Pipeline auftreten,
technisch unkritisch sind und bewusst akzeptiert werden.

**Stand:** 2025-12-11
**Letzte Überprüfung:** Pipeline vollständig grün (Unit/Integration/E2E, Lint, Build)

---

## Backend (Python/pytest)

### 1. ResourceWarning: unclosed database (BEHOBEN)

**Status:** ✅ Größtenteils behoben (Stand: 2025-12-11)

**Maßnahmen durchgeführt:**

- `backend/tests/conftest.py`: `engine.dispose()` in Fixture hinzugefügt
- `backend/tests/db/test_db_init.py`: Explizites `engine.dispose()` im Test
- Ergebnis: Von ~10 Warnungen auf 1-2 reduziert

**Verbleibende Warnungen (1-2):**

```
ResourceWarning: unclosed database in <sqlite3.Connection object at 0x...>
  /Library/Frameworks/Python.framework/Versions/3.13/lib/python3.13/inspect.py:1814
  /_pytest/unraisableexception.py:33
```

**Technische Bewertung:**

- ⚠️ Verbleibende Warnungen stammen aus **tiefen Innereien** von:
    - SQLAlchemy's `inspect()` Funktion
    - Pydantic's Schema-Generierung
- ✅ Bekanntes Python 3.13 + SQLite-Interaktionsproblem
- ✅ **Kein Memory-Leak** im Produktionscode (nur in Test-Teardown-Phase)
- ✅ SQLAlchemy's Connection-Pooling funktioniert korrekt

**Warum nicht weiter fixen?**

1. Die Warnungen treten nur bei Test-Teardown auf (Garbage Collection)
2. Unser Code hat alle Engines/Sessions korrekt disposed
3. Weitere Fixes würden tief in SQLAlchemy/Pydantic-Internals eingreifen (nicht empfohlen)
4. Funktional keine Auswirkung (alle Tests grün, keine echten Leaks)

**Monitoring:**

- Bei SQLAlchemy-Updates (>2.0.x) prüfen, ob behoben
- Bei Python 3.14 erneut testen

---

### 2. PytestAssertRewriteWarning: anyio

**Status:** ✅ Behoben durch gezielten Filter (Stand: 2025-12-11)

**Warnung (vor Behebung):**

```
PytestAssertRewriteWarning: Module already imported so cannot be rewritten: anyio
```

**Ursache:**
Das pytest-Plugin `pytest-anyio` importiert das `anyio`-Modul, bevor pytest's
Assert-Rewriting-Mechanismus greifen kann. Dies tritt nur bei E2E-Contracttests auf,
da dort pytest vom Projekt-Root aus läuft.

**Technische Bewertung:**

- ✅ Funktional unkritisch: anyio-Code funktioniert vollständig
- ✅ Nur Assertion-Introspection für anyio-interne Asserts betroffen (die es nicht gibt)
- ✅ Unsere Tests nutzen anyio nur minimal (1 Test mit `@pytest.mark.anyio`)

**Maßnahme:**

- ✅ Gezielter Filter in `pytest.ini` (Projekt-Root):
  ```ini
  filterwarnings =
      ignore:Module already imported so cannot be rewritten.*anyio:pytest.PytestAssertRewriteWarning
  ```
- Filter ist eng gefasst (nur anyio, nur PytestAssertRewriteWarning)
- Kommentar in `pytest.ini` verweist auf diese Dokumentation

**Referenz:**

- `backend/tests/auth/sec/test_token_blacklist.py:32` nutzt `@pytest.mark.anyio`
- pytest-anyio Plugin Version: 4.12.0
- Filter aktiv seit: 2025-12-11

---

## Mobile (npm/Expo/React Native)

### 1. npm deprecated: transitive Dependencies

**Status:** ✅ Akzeptiert als Upstream-Einschränkung

**Betroffene Packages:**

```
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory.
  Do not use it. Check out lru-cache if you want a good and tested way to coalesce
  async requests by a key value, which is much more comprehensive and powerful.

npm warn deprecated rimraf@<verschiedene Versionen>
npm warn deprecated glob@<verschiedene Versionen>
npm warn deprecated domexception@<version>
npm warn deprecated abab@<version>
```

**Ursache:**
Diese Packages werden **ausschließlich transitiv** über Expo-, Jest- und
React-Native-Tooling eingebunden. Sie sind **nicht** in unseren direkten Dependencies
(`mobile/package.json`).

**Dependency-Kette (Beispiel):**

```
jest-expo → jest → jest-cli → @jest/core → jest-runner → jest-haste-map →
  walker → makedir → node-modules-regexp → glob@7 → inflight
```

**Technische Bewertung:**

- ✅ `expo-doctor`: 17/17 checks grün
- ✅ Alle Tests grün (Lint, TypeScript, Jest, Build)
- ✅ Keine funktionalen Auswirkungen
- ✅ Keine Sicherheitsprobleme (`npm audit`: 0 vulnerabilities)
- ⚠️ **Upstream-Problem:** Expo/Jest-Team muss Dependencies modernisieren

**Warum kein Upgrade?**
| Package | Aktuelle Version | Status |
|---------|------------------|---------|
| expo | ~54.0.27 | ✅ Neueste Stable |
| jest-expo | ~54.0.15 | ✅ Kompatibel mit Expo 54 |
| react-native | 0.81.5 | ✅ Korrekt für Expo 54 |
| react | 19.1.0 | ✅ Neueste Stable |

- **Expo 55:** Aktuell Beta, nicht Production-ready
- **Downgrade:** Würde Sicherheits-/Feature-Updates verlieren
- **Override erzwingen:** Könnte Build/Runtime-Inkompatibilitäten verursachen

**Maßnahme:**

1. ✅ Warnungen bewusst akzeptiert
2. 🔄 Monitoring: Bei Expo-Major-Updates (55, 56, ...) prüfen, ob behoben
3. 📊 Quarterly Review: Deprecation-Status überprüfen

**Dokumentierte Ausnahme:**

Weitere Overrides werden **nicht** hinzugefügt, um Tooling-Stabilität zu wahren.


## Pipeline-Status (Stand: 2025-12-11)

### Backend

```bash
✅ pytest -m unit         →  7 passed
✅ pytest -m integration  → 43 passed (1 ResourceWarning akzeptiert)
✅ ruff check app/        → All checks passed
✅ mypy app/              → Success: no issues found
```

### Mobile

```bash
✅ expo-doctor            → 17/17 checks passed
✅ npm run lint           → No lint errors
✅ npx tsc --noEmit       → No type errors
✅ npm test               → All tests passed
✅ npm run build          → Build successful
```

### E2E

```bash
✅ E2E-Contracttests      → Via pmcd_run run-e2e-contracts
```

---

## Wartung

**Überprüfung empfohlen bei:**

- Major-Updates von Python (3.14+), SQLAlchemy (2.1+), pytest (9.x+)
- Major-Updates von Expo (55+), React Native (0.82+), Jest (30+)
- Neuen Warnungen, die in der CI auftauchen

**Ansprechpartner:**

- Backend-Warnungen: Backend-Team
- Mobile-Warnungen: Frontend/Mobile-Team
- Pipeline: DevOps/CI-Team

---

## Referenzen

- [pytest ResourceWarnings](https://docs.pytest.org/en/stable/how-to/capture-warnings.html#resource-warnings)
- [SQLAlchemy Connection Pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [Expo Doctor](https://docs.expo.dev/more/expo-cli/#doctor)
- [npm deprecation policy](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions)
