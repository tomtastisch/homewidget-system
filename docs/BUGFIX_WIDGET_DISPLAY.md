# 🔧 Widget-Display-Bug-Fix

## Problem

Benutzer konnten nach der Registrierung keine Widgets sehen, außer im Demo-Modus.

## Root Cause

Das `@cache(expire=30)` Decorator auf dem `/api/home/feed` Endpunkt cachtete die Antwort **global** und nicht pro
Benutzer.

**Ablauf des Bugs:**

1. Demo-User (unauthentifiziert) → API-Aufruf mit leerem Array (noch keine Widgets) → wird 30 Sekunden gecacht
2. Benutzer registriert sich → ist jetzt authentifiziert → ruft `/api/home/feed` auf
3. **Problem:** Der globale Cache gibt immer noch den leeren Array zurück, obwohl der Benutzer neue Widgets hat!

## Lösung

**Entfernung des `@cache(expire=30)` Decorators** aus dem `/api/home/feed` Endpunkt.

**Änderung:**

```python
# VORHER:
@router.get("/feed", response_model=list[WidgetRead])
@cache(expire=30)
def get_feed(...):
    ...


# NACHHER:
@router.get("/feed", response_model=list[WidgetRead])
def get_feed(...):
    ...
```

### Warum ist das sicher?

1. **Rate-Limiting ist vorhanden**: Die Funktion nutzt `InMemoryRateLimiter` mit Regel `settings.FEED_RATE_LIMIT` – das
   schützt bereits vor DoS.
2. **Datenbankabfrage ist schnell**: `session.exec(select(Widget).where(Widget.owner_id == user.id)).all()` ist eine
   einfache, indexierte Abfrage.
3. **Per-User-Caching nicht möglich ohne zusätzliche Komplexität**: Das `@cache` Decorator würde nur funktionieren, wenn
   es einen user-spezifischen Cache-Key generiert, was aber nicht automatisch geschieht.

## Tests

Alle neuen Tests in `tests/widgets/test_home_feed.py` bestanden ✅:

- ✅ Feed erfordert Authentifizierung
- ✅ Feed zeigt Widgets nach Registrierung
- ✅ Feed ist user-scoped (Benutzer sehen nur ihre eigenen Widgets)
- ✅ Leerer Feed für neue Benutzer
- ✅ Feed aktualisiert sich nach Widget-Löschung

Alle existierenden Tests bestanden:

- ✅ 8 Widget-Tests
- ✅ 43 Auth-Tests

## Auswirkungen

- **Keine Breaking Changes**: API ist identisch
- **Keine Performance-Verschlechterung**: Einfache DB-Abfrage mit Caching durch Rate-Limiter-Logik
- **Korrekte Benutzererfahrung**: Benutzer sehen ihre Widgets unmittelbar nach der Erstellung/Registrierung

