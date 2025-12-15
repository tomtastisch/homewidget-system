# 🚀 Homewidget – Schnelleinstieg (2 Minuten)

## Die einzige Command, die du brauchst:

```bash
bash tools/dev/orchestration/start.sh
```

Fertig! Das startet:

- ✅ Backend (Port 8000) mit Health-Checks
- ✅ Frontend (Port 19006) mit Auto-Reload
- ✅ Logs in `/tmp/homewidget-*.log`

### Beenden

```bash
bash tools/dev/orchestration/finalize_all.sh
```

## Dann:

1. **Browser öffnen:** http://localhost:19006
2. **Registrieren** oder Demo-Widgets ansehen
3. **Testen:** Widgets erstellen, löschen, Rolle ändern

## Tests ausführen:

```bash
cd tests/e2e/browseri/playwright
npx playwright test --ui        # ⭐ Visueller Debugger!
```

## Ports blockiert?

```bash
# Sicher beenden & Ports freigeben
bash tools/dev/orchestration/finalize_all.sh
```

## Mehr Infos:

- 📘 **Vollständige Docs:** `README.md`
- 📋 **Cheatsheet:** `CHEATSHEET.sh`
- 🧪 **Tests:** `tests/e2e/browseri/README.md`

---
**Das war's! Viel Spaß!** 🎉
