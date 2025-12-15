# 🗄️ Database – Homewidget System

Status: Draft (TBD) – Grundgerüst für Schema & Migrations.

---

## Technologie & Zielsetzung

- ORM/Modelle: SQLModel (Python) – Abbildung von Entitäten → Tabellen
- Ziel: verständliches, evolvierbares Schema mit klaren Migrationen

## Aktuelles Schema (Kurzüberblick)

- Entitäten werden im Backend definiert (siehe SQLModel-Modelle)
- Lokale Entwicklungsdatenbank: Datei `homewidget.db` (SQLite)

## Migrations

- Geplantes Vorgehen: schrittweise Einführung von strukturierter Migration (z. B. via Alembic)
- Aktuell: PoC-Phase, Schema-Änderungen werden manuell koordiniert

## Performance & Indizes (TBD)

- Leselast vs. Schreiblasteinschätzung
- Nützliche Indizes, Foreign Keys, Constraints

## Backup & Wiederherstellung (TBD)

- Dev: einfache File-Kopie der SQLite-DB
- Prod (zukünftig): automatisierte Backups, Rotation

---

Weiterführend:

- CI/CD: `docs/infrastructure/CI-CD.md`
- Architektur: `docs/ARCHITECTURE.md`

---

Zuletzt aktualisiert: Dezember 2025
