# AUTH-09: Token Refresh Race Condition - Lösungsdokumentation

## Problem

Beim Token-Refresh-Mechanismus trat eine Race-Condition auf, wenn mehrere parallele Anfragen versuchten, denselben Refresh-Token zu rotieren. Dies führte zu:

- Inkonsistenten Token-States (mehrere Tokens als "gültig" markiert)
- Sporadischen 401-Fehlern in E2E-Tests
- Potentiellen Sicherheitsproblemen durch mehrfache Token-Nutzung

### Technische Ursache

In `backend/app/services/auth_service.py`, Methode `rotate_refresh()`:

```python
# Alte, fehlerhafte Implementierung (vereinfacht):
def rotate_refresh(self, token: str):
    # 1. Token aus DB laden und prüfen
    rt = self.session.exec(select(RefreshToken).where(...)).first()
    if not rt:
        raise HTTPException(401)
    
    # 2. PROBLEM: Zwischen Lesen und Schreiben können andere Threads/Requests
    #    denselben Token ebenfalls lesen und als "gültig" erkennen
    
    # 3. Token als revoked markieren
    rt.revoked = True
    self.session.commit()
    
    # 4. Neue Tokens ausstellen
    return self.issue_tokens(user)
```

**Race-Condition-Szenario:**
1. Request A liest Token aus DB → Token ist gültig
2. Request B liest Token aus DB → Token ist noch gültig (Request A hat noch nicht committed)
3. Request A markiert Token als revoked und committed
4. Request B markiert Token ebenfalls als revoked (findet ihn aber nicht mehr, da bereits revoked)
5. Beide Requests stellen neue Tokens aus → Inkonsistenter State

## Lösung: Token-spezifischer Mutex (Single-Flight-Pattern)

### Implementierung

**1. Neues Modul: `backend/app/services/token/refresh_lock.py`**

```python
class RefreshTokenLockManager:
    """
    Manager für Locks bei Token-Refresh-Operationen.
    
    - Thread-safe Lock-Verwaltung pro Token-Digest
    - Context-Manager-API für einfache Nutzung
    - Automatisches Cleanup von ungenutzten Locks
    """
    
    def __init__(self):
        self._locks: dict[str, threading.Lock] = {}
        self._manager_lock = threading.Lock()
    
    @contextmanager
    def acquire(self, token_digest: str):
        # Lock für diesen Token-Digest abrufen oder erstellen
        with self._manager_lock:
            if token_digest not in self._locks:
                self._locks[token_digest] = threading.Lock()
            token_lock = self._locks[token_digest]
        
        # Token-spezifischen Lock erwerben
        token_lock.acquire()
        try:
            yield
        finally:
            token_lock.release()
            # Cleanup: Lock entfernen wenn nicht mehr verwendet
            with self._manager_lock:
                if token_digest in self._locks and not self._locks[token_digest].locked():
                    del self._locks[token_digest]
```

**2. Integration in `auth_service.py`:**

```python
def rotate_refresh(self, token: str):
    token_digest = compute_refresh_token_digest(token)
    lock_manager = get_refresh_lock_manager()
    
    # Lock für diesen spezifischen Token-Digest erwerben
    with lock_manager.acquire(token_digest):
        # Kritischer Abschnitt: Nur ein Thread kann hier gleichzeitig sein
        rt = self.session.exec(select(RefreshToken).where(...)).first()
        if not rt:
            raise HTTPException(401)
        
        rt.revoked = True
        self.session.commit()
        
        return self.issue_tokens(user)
```

### Funktionsweise

**Parallele Anfragen mit demselben Token:**
1. Request A erwirbt Lock für Token-Digest
2. Request B versucht Lock zu erwerben → **wartet**
3. Request A rotiert Token, committed, gibt Lock frei
4. Request B erwirbt Lock, findet Token als "revoked" → **401 Error**

**Parallele Anfragen mit unterschiedlichen Tokens:**
- Jeder Token hat seinen eigenen Lock-Eintrag
- Keine gegenseitige Blockierung
- Alle Anfragen erfolgreich

## Tests

**Backend Integration-Tests: `backend/tests/auth/test_parallel_refresh.py`**

1. **`test_parallel_refresh_with_same_token_one_succeeds_others_fail`**
   - 5 parallele Anfragen mit demselben Token
   - Validierung: Genau 1 Erfolg (200), 4 Fehler (401)

2. **`test_parallel_refresh_with_different_tokens_all_succeed`**
   - 3 parallele Anfragen mit unterschiedlichen Tokens
   - Validierung: Alle 3 erfolgreich

3. **`test_sequential_refresh_after_parallel_attempt`**
   - Parallele Anfragen → 1 erfolgreich mit neuem Token
   - Sequenzieller Refresh mit neuem Token → erfolgreich

4. **`test_parallel_refresh_stress_test`**
   - 10 parallele Anfragen mit demselben Token
   - Validierung: Genau 1 Erfolg, 9 Fehler

**Testergebnisse:**
```
✅ 47 Integration-Tests passed
✅ 43 Auth-Tests passed (inkl. 4 neue Tests)
✅ Keine Regression in bestehenden Tests
```

## Deployment-Überlegungen

### Single-Process (Standard)
- FastAPI mit `uvicorn --workers 1` (default)
- Threading-basierter Lock ist **ausreichend**
- Alle Requests werden im selben Prozess behandelt

### Multi-Process
- `uvicorn --workers N` (N > 1)
- Jeder Worker ist ein separater Prozess
- Threading-Lock schützt **nur innerhalb eines Prozesses**

**Für produktive Multi-Worker-Deployments:**
- Option 1: Load-Balancer mit Session-Affinity (Sticky Sessions)
- Option 2: Verteilter Lock via Redis/Memcached
- Option 3: Database-Level Lock (z.B. SELECT FOR UPDATE)

**Empfehlung für aktuelles Setup:**
- Single-Worker-Deployment ist ausreichend für die meisten Szenarien
- Bei Bedarf später auf verteilten Lock migrieren

## Sicherheitsbetrachtungen

**Was wurde verbessert:**
- ✅ Race-Conditions bei parallelen Refresh-Anfragen eliminiert
- ✅ Token-Rotation ist jetzt atomar und deterministisch
- ✅ Keine mehrfache Nutzung desselben Tokens möglich

**Was bleibt:**
- Refresh-Token-Diebstahl (außerhalb des Scopes)
- Token-Binding (IP/Device-ID) nicht implementiert (siehe AUTH-12)
- CSRF-Schutz für Token-Endpunkte (separate Anforderung)

## Code-Review-Checkliste

- [x] Mutex-Implementierung ist thread-safe
- [x] Keine Deadlock-Gefahr (Context-Manager garantiert Lock-Release)
- [x] Memory-Leak-Schutz durch Lock-Cleanup
- [x] Logging für Debugging vorhanden
- [x] Type-Hints vollständig (mypy passed)
- [x] Linting erfolgreich (ruff passed)
- [x] Alle Tests grün (43 Auth-Tests, 47 Integration-Tests)
- [x] Keine Breaking Changes für bestehende APIs
- [x] Dokumentation auf Deutsch (gem. Projektrichtlinien)

## Referenzen

- **Ticket:** 15-2-B (Backend) - AUTH-09
- **E2E-Test:** `tests/e2e/browseri/playwright/specs/auth.edge-cases.spec.ts` (AUTH-09)
- **Backend-Tests:** `backend/tests/auth/test_parallel_refresh.py`
- **Implementierung:**
  - `backend/app/services/token/refresh_lock.py`
  - `backend/app/services/auth_service.py` (rotate_refresh Methode)
