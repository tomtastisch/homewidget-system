# 👨‍💻 Development – Homewidget System

Dieser Ordner enthält **Richtlinien, Tools und Techniken für tägliche Entwicklung**.

---

## 📚 Inhaltsübersicht

### [GUIDELINES.md](GUIDELINES.md)

**Die wichtigste Datei!** Code-Standards, Architektur-Vorgaben, Type-Hints, Dokumentation.

**Immer lesen wenn**: Du Code schreibst oder reviewst.

### [TESTING.md](TESTING.md)

Test-Strategie: Unit-Tests, Integration-Tests, E2E-Tests, Fixtures.

**Lies dies wenn**: Du Tests schreibst oder die Test-Struktur verstehen möchtest.

### [TOOLS.md](TOOLS.md) *(Wird generiert aus tools/)*

CLI-Tools, Scripts, Workflows, Shortcuts.

**Lies dies wenn**: Du wissen möchtest, welche Tools zur Verfügung stehen.

### [TROUBLESHOOTING.md](TROUBLESHOOTING.md) *(TBD)*

Häufige Probleme, Lösungen, Debug-Tipps.

**Lies dies wenn**: Etwas nicht funktioniert oder du stuck bist.

### [TESTING_SECURITY.md](TESTING_SECURITY.md) *(vorhanden)*

Security-spezifische Tests, Pentesting, Vulnerability-Scanning.

**Lies dies wenn**: Du Security-Tests schreibst oder Code-Audits machst.

---

## 🏗️ Beziehung zu anderen Docs

```
GUIDELINES.md  ← Code-Standards, die beim Schreiben gelten
    ↓
Code (Python, TypeScript)
    ↓
    ├─ Tests (TESTING.md)
    │
    ├─ Tools (TOOLS.md)
    │
    ├─ Security (TESTING_SECURITY.md, core/SECURITY.md)
    │
    └─ Probleme? (TROUBLESHOOTING.md)
```

---

## 🔄 Typischer Workflow

1. **Feature planen** → Schau [GUIDELINES.md](GUIDELINES.md) (Architektur, Style)
2. **Code schreiben** → Folge [GUIDELINES.md](GUIDELINES.md)
3. **Tests schreiben** → Folge [TESTING.md](TESTING.md)
4. **Tools nutzen** → Schau [TOOLS.md](TOOLS.md) (Linting, Testing-Commands)
5. **Stuck?** → Schau [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
6. **Code Review** → Nutze [GUIDELINES.md](GUIDELINES.md) Checkliste

---

## 📊 Schnelle Links

- [QUICKSTART.md](../QUICKSTART.md) – 2-Min Einstieg
- [ARCHITECTURE.md](../ARCHITECTURE.md) – System-Übersicht
- [core/](../core/) – Domain-Konzepte

---

*Zuletzt aktualisiert: Dezember 2025*

