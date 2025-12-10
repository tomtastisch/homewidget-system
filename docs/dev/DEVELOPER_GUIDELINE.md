### RN HomeScreen – Widgets nach Typ rendern

Dieser Client rendert Widgets auf Basis eines Backend‑Schemas. Das Backend liefert ein `WidgetRead`‑Objekt mit den
Feldern `id`, `name`, `config_json`, …

Der eigentliche Render‑Typ (z. B. `card`, `banner`) steckt im JSON‑String `config_json`.

#### Relevante Dateien

- `src/api/homeApi.ts`: Typ `BackendWidget` (1:1 zu Backend) und `getHomeWidgets()`.
- `src/types/widgets.ts`: Union‑Typen für `WidgetType` und Parser `parseBackendWidget()` (parst `config_json`).
- `src/components/widgets.tsx`: Minimalistische UI‑Komponenten `WidgetCard` und `WidgetBanner` inkl. CTA‑Button.
- `src/screens/HomeScreen.tsx`: Rendert die Liste. Mapping von `config.type` → Komponente (Switch‑Case).

#### Neues Widget‑Layout hinzufügen

1. Typ definieren
    - In `src/types/widgets.ts` den Union‑Typ `WidgetType` erweitern, z. B. `| 'hero'`.
    - Optional: Spezifische Config‑Schnittstelle ergänzen (z. B.
      `type HeroWidgetConfig = WidgetConfigBase & { type: 'hero'; badge?: string }`).

2. UI‑Komponente implementieren
    - Neue Komponente in `src/components/` anlegen (oder zu `widgets.tsx` hinzufügen), z. B. `WidgetHero`.

3. Mapping im HomeScreen ergänzen
    - In `src/screens/HomeScreen.tsx` im Switch auf `cfg.type` einen neuen Fall `case 'hero': return <WidgetHero .../>`
      hinzufügen.

4. CTA‑Interaktion (optional)
    - Aktuell ist die CTA ein Platzhalter (`Alert` und `console.log`). Später kann dies durch echte Deeplinks ersetzt
      werden. Die Ziel‑URL liegt in `cfg.cta_target`.

5. Tests anlegen
    - Snapshot/Rendering‑Test für die neue Komponente unter `src/__tests__/` erstellen.
    - Optional: Einen HomeScreen‑Test um das neue Widget erweitern.

#### Demo vs. User

- Nicht eingeloggte Nutzer sehen eine Demo‑Kennzeichnung (Banner + Badge `DEMO`).
- Eingeloggte Nutzer sehen die aktuelle Rolle (Badge `COMMON`/`PREMIUM`).

#### Styling

- Die Komponenten nutzen einfache, neutrale Styles (Spacing, Typographie, Card/Banner‑Grundlagen) und lassen sich später
  leicht in ein Design‑System überführen.
