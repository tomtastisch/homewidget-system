# 📖 Homewidget System – Dokumentation

Willkommen zur Dokumentation des **Homewidget Systems**, ein PoC für ein Home-Widget-System (ähnlich CHECK24).

---

## 🚀 Schnelleinstieg

**Du brauchst nur einen Command:**

```bash
bash tools/dev/start_local.sh
```

Danach:

- 🌐 **Backend**: http://localhost:8000
- 📱 **Frontend**: http://localhost:19006
- 📖 **API-Docs**: http://localhost:8000/docs

**Weitere Infos:** Siehe [QUICKSTART.md](QUICKSTART.md)

---

## 📚 Dokumentations-Übersicht

### 🏗️ **Architektur & Konzepte**

- **[ARCHITECTURE.md](ARCHITECTURE.md)** – Systemarchitektur, Schichten, Datenfluss
- **[CONCEPTS.md](core/CONCEPTS.md)** – Kernkonzepte (Auth, Widgets, Freemium, Cache)

### 👨‍💻 **Für Entwickler**

- **[GUIDELINES.md](development/GUIDELINES.md)** – Code-Standards, Type-Hints, Architektur-Vorgaben
- **[development/TESTING.md](development/TESTING.md)** – Test-Strategie (Unit, Integration, E2E)
- **[development/TOOLS.md](development/TOOLS.md)** – Tools, CLI-Commands, Workflows
- **[development/TROUBLESHOOTING.md](development/TROUBLESHOOTING.md)** – Häufige Probleme & Lösungen

### 🔐 **Domänen & Features**

- **[core/AUTHENTICATION.md](core/AUTHENTICATION.md)** – Auth-Flow, Token, Blacklist
- **[core/FREEMIUM.md](core/FREEMIUM.md)** – Freemium-System, Pricing-Logik
- **[core/WIDGETS.md](core/WIDGETS.md)** – Widget-Domain, Rendering, Config

### 🔄 **Infrastruktur & Deployment**

- **[infrastructure/CI-CD.md](infrastructure/CI-CD.md)** – GitHub Actions, Pipeline, Checks
- **[infrastructure/DATABASE.md](infrastructure/DATABASE.md)** – Schema, Migrations, ORM (SQLModel)

### 🧪 **Testing**

- **[development/TESTING.md](development/TESTING.md)** – Test-Strategie allgemein
- **[e2e/README.md](e2e/README.md)** – E2E-Tests mit Playwright
- **[development/TESTING_SECURITY.md](development/TESTING_SECURITY.md)** – Security-Tests

---

## 📁 Struktur dieser Dokumentation

```
docs/
├── README.md                           # 👈 Du bist hier
├── QUICKSTART.md                       # Schnelleinstieg (2 Min)
├── ARCHITECTURE.md                     # System-Übersicht
├── CONCEPTS.md                         # TBD: Zentrale Konzepte
│
├── core/                               # Domain & Feature-Doku
│   ├── AUTHENTICATION.md
│   ├── FREEMIUM.md
│   ├── WIDGETS.md
│   └── SECURITY.md
│
├── development/                        # Für Entwickler
│   ├── GUIDELINES.md
│   ├── TESTING.md
│   ├── TESTING_SECURITY.md
│   ├── TOOLS.md
│   └── TROUBLESHOOTING.md
│
├── infrastructure/                     # Ops & Deployment
│   ├── CI-CD.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
│
├── e2e/                                # E2E-Tests spezifisch
│   ├── README.md
│   ├── playwright-testing-guide.md
│   ├── QUARANTINE.md
│   └── ...
│
├── dev/                                # Weitere Dev-Docs (zu konsolidieren)
│   └── ...
│
├── backend/                            # Backend-spezifische Doku
│   └── ...
│
└── archived/                           # Alte, abgeschlossene Dokumente
    └── ...
```

---

## 🎯 Wo beginne ich?

### Ich bin neu im Projekt

1. Lies [QUICKSTART.md](QUICKSTART.md) (2 Min)
2. Schau dir [ARCHITECTURE.md](ARCHITECTURE.md) an (5–10 Min)
3. Dann: [development/GUIDELINES.md](development/GUIDELINES.md) für Code-Standards

### Ich möchte etwas Implementieren

1. **Welche Domain?** → Schau in `core/` (AUTHENTICATION, WIDGETS, etc.)
2. **Code-Standards?** → [development/GUIDELINES.md](development/GUIDELINES.md)
3. **Wie teste ich?** → [development/TESTING.md](development/TESTING.md)
4. **Stuck?** → [development/TROUBLESHOOTING.md](development/TROUBLESHOOTING.md)

### Ich muss die Infra/DevOps verstehen

1. [infrastructure/CI-CD.md](infrastructure/CI-CD.md) – GitHub Actions
2. [infrastructure/DATABASE.md](infrastructure/DATABASE.md) – Schema & Migrations
3. [development/TOOLS.md](development/TOOLS.md) – Scripts & Automation

---

## 🔄 Konventionen

- **Sprache**: Deutsch (Code, Kommentare, Docstrings, Dokumentation)
- **Code-Stil**: Siehe [development/GUIDELINES.md](development/GUIDELINES.md) (PEP-8, Type-Hints, Clean Architecture)
- **Tests**: `pytest`-kompatibel, deterministisch, schnell
- **Commits**: Aussagekräftig, logisch gruppiert
- **PRs**: Beschreibung, Testergebnisse, Review-Ready

---

## 📞 Hilfreiche Links

- **Backend-Tests ausführen**: `cd backend && pytest`
- **E2E-Tests ausführen**: `cd tests/e2e/browseri && npx playwright test --ui`
- **Ports blockiert?** → [development/TROUBLESHOOTING.md](development/TROUBLESHOOTING.md)
- **Alte Dokumente?** → `archived/` – aber wahrscheinlich veraltet

---

## ✅ Nächste Schritte

Diese Dokumentation wird kontinuierlich gepflegt. Falls du:

- 🐛 Fehler findest → Issue/PR mit Besserungsvorschlag
- 📝 Etwas ist unklar → Docstring/Kommentar im Code ergänzen
- 🔄 Doppelte Inhalte findest → In `archived/` oder zur Konsolidierung vorschlagen

**Ziel**: Eine Single Source of Truth für jede Komponente, keine Redundanz.

---

*Zuletzt aktualisiert: Dezember 2025*

