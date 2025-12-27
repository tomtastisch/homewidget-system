# DEVELOPER_GUIDELINE.md - Homewidget System

Diese Richtlinie richtet sich an dezentrale Produktteams, die neue Widgets oder Funktionen in das Homewidget-System
integrieren möchten.

---

## 🛠️ Integration & Contracts

Die Kommunikation zwischen Frontend und Backend erfolgt über standardisierte Verträge (Contracts).

### Widget-Vertrag (V1)

Jedes neue Widget muss dem `WidgetRead`-Schema entsprechen:

- `product_key`: Eindeutiger Identifikator.
- `type`: Einer der unterstützten Typen (`card`, `banner`, `hero`).
- `config_json`: Widget-spezifische Konfiguration.

**Beispiel Request (Home Feed):**

```http
GET /api/home
Authorization: Bearer <JWT_TOKEN>
```

**Beispiel Response:**

```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "product_key": "credit_card_deals",
        "type": "banner",
        "title": "Exklusive Kreditkarten-Deals",
        "description": "Jetzt beantragen und 50€ Bonus sichern.",
        "config_json": "{\"color\": \"blue\", \"link\": \"/finance/cards\"}",
        "visibility_rules": "[\"common\", \"premium\"]",
        "priority": 100
    }
]
```

---

## 🔄 Versionierung & Abwärtskompatibilität

- **API-Versionierung**: Versionen werden über den URL-Pfad gesteuert (z.B. `/api/v1/...`).
- **Breaking Changes**: Feld-Entfernungen oder Typ-Änderungen in bestehenden Contracts sind zu vermeiden. Neue Felder
  müssen optional sein.

---

## ⚡ Performance & Caching

- **Backend-Caching**: Der Home-Feed wird standardmäßig für 5 Minuten gecacht.
- **Client-Side Caching**: Mobile Clients sollten die Widgets lokal für die Dauer der Session cachen, um unnötige
  API-Calls zu vermeiden.
- **Rate Limiting**: Standardmäßig sind 5 Login-Versuche pro Minute erlaubt. API-Calls sind auf 100 Requests/Minute pro
  User limitiert.

---

## ❌ Fehlerbehandlung

Das System verwendet Standard-HTTP-Statuscodes:

- `200 OK`: Erfolgreich.
- `401 Unauthorized`: Token fehlt oder ist ungültig.
- `403 Forbidden`: Rolle unzureichend für die angeforderte Ressource.
- `429 Too Many Requests`: Rate Limit überschritten.
- `500 Internal Server Error`: Schwerwiegender Fehler im Backend.

---

## 🤝 Ownership & SLAs

- **Core-System**: Verantwortlich für Auth, Feed-Aggregator und Widget-Infrastruktur.
- **Produkt-Teams**: Verantwortlich für die Implementierung ihrer spezifischen Widgets, die Datenqualität ihrer Provider
  und die Einhaltung der Performance-Grenzwerte (< 200ms Response Time für Provider-Daten).

---

## 📱 Multi-Platform Support

Das System unterstützt:

1. **Web (React Native Web)**: Primäre Plattform für Desktop und Mobile Browser.
2. **iOS (Swift Native)**: Demo-Modul vorhanden (`ios/`), Integration via REST-API.
3. **Android (Kotlin)**: Zukünftig über das gleiche REST-Interface.
