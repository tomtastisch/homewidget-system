### Test-Pattern (React Native / RTL)

- Primäre Selektoren: `getByTestId` (sync), `findByTestId` (async), `queryByTestId` (negativ)
- Textsuche (`getByText`) nur für inhaltliche Assertions innerhalb eines bereits gefundenen Elements (z. B. Badge-Text),
  nicht als primärer Locator.
- Asynchrone Zustände nicht über Magic-Timeouts testen, sondern über explizite State-IDs (`loading`, `empty`,
  `widgets.list`).

### Zentrale TestIDs

- Datei: `src/testing/testids.ts`
- Import: `import {TID} from '../testing/testids'`
- Beispiel Home:

```ts
TID.home.screen
TID.home.header.title
TID.home.role.badge
TID.home.loading
TID.home.empty
TID.home.widgets.list
TID.home.loginLink
```

### Query/Async Stabilität

- In Tests: `new QueryClient({ defaultOptions: { queries: { retry: false } } })`
- Ready-State über `await findByTestId(TID.home.widgets.list)` prüfen; `waitFor(getByText(...))` vermeiden.

### Cleanup & Open Handles

- Keine manuell gesetzten Interval/Timeouts in Tests.
- `@testing-library/react-native` räumt nach jedem Test auf; zusätzliches `cleanup()` ist i. d. R. nicht nötig.
