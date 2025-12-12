# UI-Signale Implementierung - Ticket C

## Übersicht

Dieses Dokument beschreibt die Implementierung der 7 Must-Have testIds für Ticket C (UI-Signale).

## Implementierte Features

### 1. Widget-Namen im Feed (testId: `feed.widget.name`)

**Dateien:** `mobile/src/components/widgets.tsx`

**Änderungen:**
- `WidgetCard`: Title-Text erhält testID `feed.widget.name`
- `WidgetBanner`: Title-Text erhält testID `feed.widget.name`

**Verwendung:**
```typescript
// Tests können Widget-Namen nun über testID oder Text finden
await expect(page.getByTestId('feed.widget.name')).toBeVisible();
await expect(page.getByText('Feed Test Widget 1')).toBeVisible();
```

### 2. Empty-State Feed (testId: `feed.empty`)

**Dateien:** `mobile/src/screens/HomeScreen.tsx`

**Änderungen:**
- ListEmptyComponent erhält testID `feed.empty`
- Wird nur angezeigt wenn keine Widgets vorhanden und kein Fehler

**Verwendung:**
```typescript
await expect(page.getByTestId('feed.empty')).toBeVisible();
```

### 3. Loading-Indicator (testId: `loading.spinner`)

**Dateien:** `mobile/src/screens/HomeScreen.tsx`

**Änderungen:**
- ActivityIndicator mit testID `loading.spinner` hinzugefügt
- Wird während Lade-Vorgängen angezeigt
- Verschwindet nach erfolgreichem Laden oder bei Fehler

**Verwendung:**
```typescript
await expect(page.getByTestId('loading.spinner')).toBeVisible();
// Nach Laden:
await expect(page.getByTestId('loading.spinner')).not.toBeVisible();
```

### 4. Rollen-Anzeige (testId: `account.role`)

**Dateien:** `mobile/src/screens/AccountScreen.tsx`

**Änderungen:**
- Rollen-Text erhält testID `account.role`
- Zeigt die aktuelle Benutzerrolle (demo/common/premium)

**Verwendung:**
```typescript
await expect(page.getByTestId('account.role')).toHaveText('demo');
```

### 5. Rate-Limit-Fehler (testId: `login.error.rateLimit`)

**Dateien:** `mobile/src/screens/LoginScreen.tsx`

**Änderungen:**
- 429-Status-Fehler werden speziell behandelt
- Fehlertext erhält testID `login.error.rateLimit` bei Rate-Limit
- Sonstiger Fehlertext erhält testID `login.error`

**Verwendung:**
```typescript
await expect(page.getByTestId('login.error.rateLimit')).toBeVisible();
await expect(page.getByText(/Zu viele Anmeldeversuche/i)).toBeVisible();
```

### 6. Error-Toast (testId: `error.toast`)

**Dateien:** 
- `mobile/src/ui/Toast.tsx` (neu)
- `mobile/src/ui/ToastContext.tsx` (neu)
- `mobile/src/App.tsx`
- `mobile/src/screens/HomeScreen.tsx`

**Änderungen:**
- Neue Toast-Komponente für Feedback-Meldungen
- ToastProvider für globale Toast-Verwaltung
- Hook `useToast()` für einfache Nutzung
- Toast-Typen: error, success, info
- Automatisches Ausblenden nach konfigurierbarer Dauer

**Verwendung:**
```typescript
// In Komponente:
const {showError, showSuccess, showInfo} = useToast();
showError('Fehler beim Laden');

// In Test:
await expect(page.getByTestId('error.toast')).toBeVisible();
```

### 7. Offline-Indikator (testId: `status.offline`)

**Dateien:**
- `mobile/src/ui/OfflineIndicator.tsx` (neu)
- `mobile/src/App.tsx`

**Änderungen:**
- Neue OfflineIndicator-Komponente
- Nutzt Browser-API (navigator.onLine) für Web
- Reagiert auf 'online'/'offline' Events
- Zeigt Warnung am oberen Bildschirmrand

**Verwendung:**
```typescript
// Bei Offline-Status:
await expect(page.getByTestId('status.offline')).toBeVisible();
// Bei Online-Status:
await expect(page.getByTestId('status.offline')).not.toBeVisible();
```

## Integration

### App-Struktur

```
App (ToastProvider → AuthProvider → OfflineIndicator → Router)
├── Toast (error.toast)
├── OfflineIndicator (status.offline)
└── NavigationContainer
    ├── HomeScreen
    │   ├── loading.spinner
    │   ├── feed.empty
    │   └── WidgetCard/WidgetBanner (feed.widget.name)
    ├── AccountScreen (account.role)
    └── LoginScreen (login.error.rateLimit)
```

## Nächste Schritte (Ticket D)

Nach dieser Implementierung können die BLOCKED-UI Skips in den E2E-Tests entfernt werden:

1. Entferne `test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...')` aus allen Tests
2. Aktiviere TODO-Assertions, die auf diese testIds warten
3. Führe Tests lokal und in CI aus
4. Verifiziere 100% Pass-Rate

## Betroffene Tests

Die folgenden Tests können nach dieser Implementierung entblockt werden:

### Core-Standard (Prio 1)
- FEED-01: Widget-Namen im Feed
- FEED-03: Rate-Limit Error-Handling
- FEED-04: XSS-Schutz (Widget-Namen im DOM)
- FEED-05: Empty-State
- WIDGET-02: Widget im Feed sehen
- AUTH-08: Rate-Limit beim Login
- INFRA-02: Generic Error-Toast
- INFRA-03: Backend nicht erreichbar
- INFRA-05: Loading-States

### Core-Advanced (Prio 2)
- ROLE-01: Rollen-Anzeige (3 Tests)
- ROLE-02: Rollenspezifische Features (3 Tests)
- INFRA-06: Offline-Modus
- INFRA-07: Timeout-Handling
- INFRA-08: Backend-Recovery

## Akzeptanzkriterien ✅

- [x] Alle 7 testIds implementiert
- [x] Tests können auf testIds selektieren
- [x] Keine Breaking Changes
- [x] Komponenten folgen Coding-Guidelines
- [x] Deutsche Kommentare und Dokumentation
- [x] TypeScript-Typen korrekt

## Technische Details

### Toast-System

Das Toast-System nutzt React Context für globale Zustandsverwaltung:

```typescript
// Provider in App-Root
<ToastProvider>
  <App />
</ToastProvider>

// Verwendung in Komponente
const {showError} = useToast();
showError('Fehlermeldung');
```

### Offline-Detection

Der Offline-Indikator nutzt die Browser-API:

```typescript
// Initial Check
navigator.onLine

// Event-basiert
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
```

### Loading-State

Der Loading-Spinner wird basierend auf dem State angezeigt:

```typescript
{loading && !error && (
  <ActivityIndicator testID="loading.spinner" />
)}
```

## Kompatibilität

- **Web (Expo):** ✅ Vollständig unterstützt
- **iOS (Native):** ⚠️ OfflineIndicator benötigt @react-native-community/netinfo
- **Android (Native):** ⚠️ OfflineIndicator benötigt @react-native-community/netinfo

Für native Apps muss die Dependency installiert werden:
```bash
npm install @react-native-community/netinfo
```

## Änderungshistorie

- 2025-12-12: Initial-Implementierung aller 7 UI-Signale
