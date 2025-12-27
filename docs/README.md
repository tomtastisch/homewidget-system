# 📖 Dokumentation – Homewidget System

Minimal-Set für CHECK24: Setup, Architektur, Tests, Sicherheit und Troubleshooting.

---

## 📚 Dokumentations-Übersicht

| Datei                                                    | Inhalt                                              | Zeit   |
|----------------------------------------------------------|-----------------------------------------------------|--------|
| **[SETUP_AND_RUN.md](SETUP_AND_RUN.md)** ⭐               | Voraussetzungen, Setup, Start/Stop, Env-Variablen   | 5 Min  |
| **[ARCHITECTURE.md](ARCHITECTURE.md)**                   | Schichten, Module, Datenfluss, Tech-Stack           | 10 Min |
| **[TECHNICAL_CONCEPT.md](TECHNICAL_CONCEPT.md)**         | Auth, Widgets, Rollen, Datenmodell, Konfiguration   | 10 Min |
| **[CI_TESTING.md](CI_TESTING.md)**                       | CI-Pipeline, Tests, Local Reproduktion, Playwright  | 10 Min |
| **[SECURITY.md](SECURITY.md)**                           | JWT, Token-Blacklist, Passwort-Hashing, Validierung | 10 Min |
| **[TROUBLESHOOTING.md](development/TROUBLESHOOTING.md)** | Häufige Fehler, Lösungen, akzeptierte Warnungen     | 5 Min  |

---

## 🎯 Schnell-Navigation

**Ich bin neu im Projekt:**

1. Lese: [SETUP_AND_RUN.md](SETUP_AND_RUN.md) (5 Min)
2. Starte: `bash tools/dev/orchestration/start.sh`
3. Erkunde: [ARCHITECTURE.md](ARCHITECTURE.md) (10 Min)

**Ich möchte Code schreiben:**

1. Lese: [TECHNICAL_CONCEPT.md](TECHNICAL_CONCEPT.md) (Konzepte)
2. Lese: [SECURITY.md](SECURITY.md) (Auth & Secrets)
3. Starte Code, schreibe Tests (siehe [CI_TESTING.md](CI_TESTING.md))

**Etwas funktioniert nicht:**
→ [TROUBLESHOOTING.md](development/TROUBLESHOOTING.md)

---

## 🔗 Links

- **Backend API**: http://127.0.0.1:8000/docs (Swagger, lokal)
- **Frontend**: http://localhost:19006 (Expo, lokal)
- **Repository**: (dein Git-Repo)

---

*Zuletzt aktualisiert: Dezember 2025*

