# 🔄 E2E-Test-Management: Quarantäne & Releases

Verwaltung von blockierten Tests, Quarantäne-Handling und TODO-Abbau nach UI-Feature-Releases.

---

## 📋 Überblick

### Situation

- Tests werden blockiert, wenn UI-Features noch nicht implementiert sind
- Blockierte Tests sollten **lokal laufen** (Entwicklung), aber in **CI übersprungen** werden
- Nach Feature-Implementierung müssen alle Skips & TODOs entfernt werden

### Status

- **Aktuelle blockierte Tests:** 3 (Stand: Dezember 2025)
- **Entblockt nach Ticket C+D:** 15 Tests ✅
- **Ziel:** 0 blockierte Tests

---

## 🚫 Test-Quarantäne-Mechanismus

### Skip-Format (BLOCKED-UI)

```typescript
test('@standard TEST-ID: Beschreibung', async ({ page }) => {
  // ⚠️ BLOCKIERT - Skip nur in CI
  test.skip(
    process.env.CI === 'true',
    'BLOCKED-UI: Feature ist nicht implementiert. Entfernen sobald Feature X gemergt ist.'
  );
  
  // Test-Code läuft lokal, wird in CI übersprungen
  await page.goto('/path');
  await expect(page.locator('missing-feature')).toBeVisible();
});
```

### Bestandteile

| Bestandteil        | Beispiel                             | Erklärung                   |
|--------------------|--------------------------------------|-----------------------------|
| **Condition**      | `process.env.CI === 'true'`          | Überspringt nur in CI       |
| **BLOCKED-UI**     | `'BLOCKED-UI: ...'`                  | Einheitliche Identifikation |
| **Grund**          | `'Feature nicht implementiert'`      | Was fehlt?                  |
| **Exit-Kriterium** | `'Entfernen wenn Feature X gemergt'` | Wann aktivieren?            |

---

## 🔍 Quarantäne-Überwachung

### Status prüfen

```bash
cd tests/e2e/browseri/playwright

# Alle BLOCKED-UI Skips finden
grep -rn "BLOCKED-UI" specs/

# Count
grep -rn "BLOCKED-UI" specs/ | wc -l
```

---

## 🎯 Nach Feature-Implementierung: TODO-Abbau

### Prozess (3 Phasen)

#### Phase 1: Vorbereitung

```bash
# Neue testIds überprüfen
grep -rn "data-testid=" src/

# Inventar erstellen
bash tools/dev/pipeline/ui_release_todo_mapping.sh
```

#### Phase 2: Tests aktualisieren

**Vorher:**

```typescript
test('@standard FEED-01: Widget-Namen', async ({ page }) => {
  test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...');
  await expect(page.locator('[data-testid=feed.widget.name]')).toBeVisible();
});
```

**Nachher:**

```typescript
test('@standard FEED-01: Widget-Namen', async ({ page }) => {
  // Skip entfernt, Test läuft normal
  await expect(page.locator('[data-testid=feed.widget.name]')).toBeVisible();
});
```

#### Phase 3: Validierung

```bash
# Lokal testen
npx playwright test

# Keine BLOCKED-UI Skips mehr
grep -rn "BLOCKED-UI" specs/ | wc -l  # Sollte: 0 (für betroffene Features)

# Quality-Gates prüfen
npx playwright test --grep @standard
```

---

## 📊 Aktueller Status (Dezember 2025)

### Blockierte Tests: 3

- **ROLE-02**: Feature-Visibility nach Rolle
- **PREMIUM-01**: Premium-Feature-Gating
- **FREEMIUM-ADVANCED-01**: Advanced-Szenarien

### Entblockt (15 Tests) ✅

✅ Widget/Feed-Anzeige (4)  
✅ Error-Handling (5)  
✅ Loading-States (3)  
✅ Rollen-Anzeige (3)

---

## 🔧 Tools & Scripts

```bash
# Quarantäne-Report
bash tools/dev/pipeline/quarantine_report.sh

# TODO-Mapping-Tool
bash tools/dev/pipeline/ui_release_todo_mapping.sh
```

---

## 🎓 Best Practices

✅ **Nutze Skip sinnvoll** – Nur für echte UI-Blockaden  
✅ **Gib Exit-Kriterium** – Wann wird Skip entfernt?  
✅ **Verfolge Quarantäne** – Wöchentliche Reports  
✅ **Nach Feature-Impl** – Alle Skips entfernen!

---

*Zuletzt aktualisiert: Dezember 14, 2025*

