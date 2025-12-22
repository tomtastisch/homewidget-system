# 🏠 Homewidget System

**Willkommen!** Dies ist die zentrale Einstiegshilfe. Alle Dokumentation findest du im `docs/` Verzeichnis.

## ⚡ Quick-Start (30 Sekunden)

```bash
bash tools/dev/orchestration/start.sh
```

**Das war's!** Backend + Frontend starten **garantiert** zuverlässig.

Dann öffne: **http://localhost:19006**

---

## 📚 Dokumentation

| Dokument                                                             | Für                        | Zeit   |
|----------------------------------------------------------------------|----------------------------|--------|
| **[docs/QUICKSTART.md](docs/QUICKSTART.md)** ⭐                       | Anfänger                   | 2 Min  |
| **[docs/README.md](docs/README.md)**                                 | Vollständiger Guide        | 30 Min |
| **[docs/development/CHEATSHEET.sh](docs/development/CHEATSHEET.sh)** | Commands nachschlagen      | 1 Min  |
| **[docs/development/README.md](docs/development/README.md)**         | Entwicklung & Richtlinien  | varies |
| **[docs/e2e/README.md](docs/e2e/README.md)**                         | E2E Testing mit Playwright | varies |
| **[backend/README.md](backend/README.md)**                           | Backend-spezifisch         | varies |

## 🎯 Nächste Schritte

1. **👉 Starte mit:** `bash tools/dev/orchestration/start.sh`
2. Öffne Browser: http://localhost:19006
3. Erkunde die App oder lese [docs/QUICKSTART.md](docs/QUICKSTART.md) für Details

## 🚀 Deployment (Docker Compose)

Für einen schnellen Start in einer produktionsnahen Umgebung:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

- **Backend:** http://localhost:8000 (Health: `/health`)
- **Web:** http://localhost:8080

## 🔗 Wichtige Links

- Backend: http://127.0.0.1:8000
- Frontend: http://localhost:19006
- Backend Docs (Swagger): http://127.0.0.1:8000/docs

## 💡 Bei Fragen

→ Siehe **[docs/development/TROUBLESHOOTING.md](docs/development/TROUBLESHOOTING.md)** für häufige Probleme

