# 🏠 Homewidget System

**Proof of Concept** für ein Widget-Management-System ähnlich CHECK24: Widget-Katalog, Home-Feed mit Personalisierung
nach Nutzer-Rolle (demo/common/premium), JWT-basierte Authentifizierung, FastAPI-Backend + React Native (Expo)-Frontend.

---

## ⚡ Quick-Start (30 Sekunden)

```bash
bash tools/dev/orchestration/start.sh
```

**Das war's!** Backend (Port 8000) + Frontend (Port 19006) starten und Health-Checks durchlaufen.

Dann öffne: **http://localhost:19006**

---

## 📂 Deliverables (Submission Requirements)

| Dokument                   | Link                                             | Beschreibung                     |
|----------------------------|--------------------------------------------------|----------------------------------|
| **CONCEPT.md**             | [CONCEPT.md](CONCEPT.md)                         | Fachliches Konzept & Architektur |
| **DEVELOPER_GUIDELINE.md** | [DEVELOPER_GUIDELINE.md](DEVELOPER_GUIDELINE.md) | Leitfaden für Produktteams       |
| **Application Video**      | [Platzhalter: Link zum Video einfügen]           | Demo der App-Funktionen          |
| **Live PoC Deployment**    | [Platzhalter: Link zum Deployment einfügen]      | Live-Version des Systems         |

---

## 📚 Dokumentation (Details)

| Dokument                                                                       | Für                                | Zeit   |
|--------------------------------------------------------------------------------|------------------------------------|--------|
| **[docs/SETUP_AND_RUN.md](docs/SETUP_AND_RUN.md)** ⭐                           | Setup, Start/Stop, Voraussetzungen | 5 Min  |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**                               | Schichten, Module, Datenfluss      | 10 Min |
| **[docs/TECHNICAL_CONCEPT.md](docs/TECHNICAL_CONCEPT.md)**                     | Auth, Widgets, Rollen, Datenmodell | 10 Min |
| **[docs/CI_TESTING.md](docs/CI_TESTING.md)**                                   | CI-Pipeline, Tests, Local Repro    | 10 Min |
| **[docs/SECURITY.md](docs/SECURITY.md)**                                       | JWT, Token, Secrets, Validierung   | 10 Min |
| **[docs/development/TROUBLESHOOTING.md](docs/development/TROUBLESHOOTING.md)** | Fehler, Warnungen, Workarounds     | 5 Min  |

---

## 🎯 Nächste Schritte

1. **Starte:** `bash tools/dev/orchestration/start.sh`
2. **Browser:** http://localhost:19006
3. **Dokumentation:** Wähle oben dein Thema

---

## 🔗 Wichtige URLs (lokal)

- **Frontend:** http://localhost:19006
- **Backend:** http://127.0.0.1:8000
- **API-Docs (Swagger):** http://127.0.0.1:8000/docs
- **Health-Check:** http://127.0.0.1:8000/health

---

## 🛑 Probleme?

→ Siehe **[docs/development/TROUBLESHOOTING.md](docs/development/TROUBLESHOOTING.md)** (Ports blockiert, Env-Fehler,
etc.)

