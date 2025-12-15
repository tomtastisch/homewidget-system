# Playwright E2E Tests – Expo-Web + FastAPI

Automatisierte E2E-Tests für das Frontend (Expo-Web) gegen das Backend (FastAPI).

**→ Siehe Haupt-README: `/Users/tomwerner/IdeaProjects/homewidget-system/README.md`**

---

## 🚀 Quick-Start

### Schnelle Variante (alles automatisch)

```bash
cd /Users/tomwerner/IdeaProjects/homewidget-system
bash tools/dev/orchestration/start.sh

# In anderem Terminal:
cd tests/e2e/browseri/playwright
npx playwright test --project=standard
```

---

## 🧪 Test-Kommandos

```bash
cd tests/e2e/browseri/playwright

# Minimal-Tests (schnell, ~2min)
npx playwright test --project=minimal

# Standard-Tests (empfohlen, ~17min)
npx playwright test --project=standard

# Alle Tests (Advanced, ~30min)
npx playwright test --project=advanced

# UI-Mode (visuell debuggen) ⭐ SEHR PRAKTISCH!
npx playwright test --ui

# Headed (sieht den Browser)
npx playwright test --project=standard --headed

# Einzelner Test
npx playwright test specs/auth.basic.spec.ts --grep "AUTH-01" --headed

# Mit Trace (Fehleranalyse)
npx playwright test --trace=on
npx playwright show-trace trace.zip
```

---

## 🔧 Konfiguration

### Port anpassen

```bash
# Wenn Server nicht auf Standardports laufen:
export PLAYWRIGHT_WEB_BASE_URL=http://localhost:8081
export E2E_API_BASE_URL=http://127.0.0.1:8001
npx playwright test --project=standard
```

### Keine Auto-Start (mit bereits laufenden Servern)

```bash
export PLAYWRIGHT_NO_AUTO_START=true
npx playwright test --project=standard
```

---

## 📝 Test-Struktur

```
specs/
├── auth.basic.spec.ts               # Login/Logout (@minimal)
├── auth.resilience.spec.ts          # Edge-Cases (@standard)
├── auth.edge-cases.spec.ts          # Komplexe Szenarien (@advanced)
├── feed.spec.ts                     # Feed-Funktionalität (@standard)
├── infra.health.spec.ts             # Health-Check (@minimal)
├── infra.resilience.spec.ts         # Error-Handling (@standard)
├── roles.spec.ts                    # Permissions (@standard)
├── widgets.basic.spec.ts            # Widget-CRUD (@minimal)
├── widgets.security.spec.ts         # Security (@minimal)
├── widgets.resilience.spec.ts       # Error-Handling (@standard)
├── security.advanced.spec.ts        # Advanced Security (@advanced)
└── browser.spec.ts                  # Browser-Compat (@standard)
```

---

## 🐛 Häufige Probleme

| Problem                  | Lösung                                                       |
|--------------------------|--------------------------------------------------------------|
| Port belegt              | `lsof -tiTCP:8000 \| xargs kill -9`                          |
| Backend nicht erreichbar | `curl http://127.0.0.1:8000/health`                          |
| Frontend timeout         | `PLAYWRIGHT_NO_AUTO_START=true npx playwright test --headed` |
| Metro cache Problem      | `npm run web -- --reset-cache`                               |

---

## 📊 Test-Status

```bash
# Beispiel-Output von letztem Run:
✅ 24 Tests bestanden
⏭️  2 Tests übersprungen (absichtlich)
⏱️  Runtime: 17.4 Sekunden
🎯 100% Erfolgsrate für implementierte Features
```

---

## 📚 Weitere Dokumentation

- **Entwicklung**: `../../README.md` (Hauptdoku)
- **Backend**: `../../backend/README.md`
- **Frontend**: `../../mobile/README.md`


