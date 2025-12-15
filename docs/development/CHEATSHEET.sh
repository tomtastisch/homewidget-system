#!/usr/bin/env bash
# Homewidget Cheatsheet – Die wichtigsten Befehle im Überblick

# ==============================================================================
# 🚀 STARTEN (alles was du normalerweise brauchst)
# ==============================================================================

# Alles in einem: Backend + Frontend starten
bash tools/dev/orchestration/start.sh

# Dann im Browser öffnen:
# http://localhost:19006

# ==============================================================================
# 🧪 TESTEN
# ==============================================================================

# Playwright E2E Tests (schnelle Variante)
# shellcheck disable=SC2164
cd tests/e2e/browseri/playwright || exit 1
npx playwright test --project=standard

# Playwright E2E Tests mit UI (visuell debuggen) ⭐ BEST
npx playwright test --ui

# Playwright E2E Tests headed (siehst den Browser)
npx playwright test --project=standard --headed

# Backend Unit Tests
cd backend || exit 1
pytest

# ==============================================================================
# 🔧 PORTS FREIGEBEN (wenn belegt)
# ==============================================================================

# Alles sicher stoppen (Backend & Frontend) und Ports freigeben
bash tools/dev/orchestration/finalize_all.sh

# ==============================================================================
# 📊 STATUS PRÜFEN
# ==============================================================================

# Backend Health-Check
curl http://127.0.0.1:8000/health | jq .

# Frontend prüfen
curl http://localhost:19006 | head -20

# Port-Status
lsof -i :8000
lsof -i :19006

# ==============================================================================
# 🛠️ SETUP & INSTALLATIONS
# ==============================================================================

# Environment einmalig setup
bash tools/dev/setup_dev_env.sh

# Backend venv neu initialisieren
cd backend || exit 1
python3.13 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Frontend Dependencies neu installieren
cd mobile || exit 1
rm -rf node_modules package-lock.json
npm install

# ==============================================================================
# 📝 EINZELNE SERVER STARTEN (für Debugging)
# ==============================================================================

# Backend allein
cd backend || exit 1
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend allein
cd mobile || exit 1
npm run web  # oder: npm run web -- --port 19006

# ==============================================================================
# 🐛 DEBUGGING
# ==============================================================================

# Backend-Logs mit stderr
cd backend || exit 1
source .venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --log-level debug

# Tests im UI-Debugger
cd tests/e2e/browseri/playwright || exit 1
npx playwright test --ui

# Tests mit Trace-Recording
npx playwright test --trace=on
npx playwright show-trace trace.zip

# Einzelnen Test debuggen
npx playwright test specs/auth.basic.spec.ts --grep "AUTH-01" --headed --debug

# ==============================================================================
# 🚄 ALLES NEU MACHEN (Nuclear Option)
# ==============================================================================

# Kompletter Fresh Start
bash tools/dev/orchestration/finalize_all.sh || true
bash tools/dev/setup_dev_env.sh
bash tools/dev/orchestration/start.sh

# ==============================================================================
# 📚 WICHTIGE DATEIEN
# ==============================================================================

# Hauptdokumentation
# /Users/tomwerner/IdeaProjects/homewidget-system/README.md

# Playwright Config
# /Users/tomwerner/IdeaProjects/homewidget-system/tests/e2e/browseri/playwright/playwright.config.ts

# Backend Config
# /Users/tomwerner/IdeaProjects/homewidget-system/backend/app/core/config.py

# Frontend API Client
# /Users/tomwerner/IdeaProjects/homewidget-system/mobile/src/api/client.ts

# ==============================================================================
# 🌍 WICHTIGE URLs
# ==============================================================================

# Backend (Development)
# http://127.0.0.1:8000
# http://127.0.0.1:8000/docs (Swagger UI)
# http://127.0.0.1:8000/health

# Frontend (Development)
# http://localhost:19006

# ==============================================================================
# 💡 TIPPS
# ==============================================================================

# • Tests blockieren? → PLAYWRIGHT_NO_AUTO_START=true npx playwright test --headed
# • Frontend hängt? → npm run web -- --reset-cache
# • Alles kaputt? → bash tools/dev/setup_dev_env.sh (einfach neu setup)
# • Port-Infos? → lsof -i :8000 und lsof -i :19006
# • Schnell testen? → npx playwright test --project=minimal (nur 2 min)

# ==============================================================================

