# CONCEPT.md - Homewidget System

Dieses Dokument beschreibt das technische Konzept des Homewidget Systems.

Die detaillierte Dokumentation der fachlichen Konzepte, des Datenmodells und der Caching-Strategien finden Sie unter:

👉 **[docs/TECHNICAL_CONCEPT.md](docs/TECHNICAL_CONCEPT.md)**

---

## Kernpunkte des Konzepts

- **Authentifizierung & Autorisierung**: JWT-basiertes System mit Access- und Refresh-Tokens sowie einer Token-Blacklist
  für sicheres Logout.
- **Rollen-basiertes Freemium-Modell**: Drei Stufen (`demo`, `common`, `premium`) steuern die Sichtbarkeit von Widgets
  im Home-Feed.
- **Widget-System**: Flexibles, konfigurierbares Widget-Modell mit serverseitiger Filterung und Sortierung nach
  Priorität.
- **Performance**: Zweistufiges Caching (API-Level & In-Memory/Redis) zur Reduzierung der Datenbanklast.
