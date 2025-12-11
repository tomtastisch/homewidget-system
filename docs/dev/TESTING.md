Mobile Testing Setup (React Native / Expo)

This project uses Jest for unit/component tests and Detox for basic E2E.

Prerequisites

- Node.js LTS
- iOS: Xcode + Command Line Tools, a recent iOS Simulator, and applesimutils (brew tap wix/brew && brew install
  applesimutils)
- Expo tooling (optional): npm i -g expo-cli

Unit & Component Tests (Jest)

- From mobile/: npm i
- Run: npm test
- We use jest-expo and @testing-library/react-native.
- Examples: src/__tests__/WidgetCard.test.tsx, src/__tests__/WidgetBanner.test.tsx, src/__tests__/HomeScreen.test.tsx
- Logic tests: src/__tests__/unit/widgets.test.ts

E2E (Detox, iOS Simulator)

1) One-time generate iOS project (Expo managed):
    - npx expo prebuild -p ios
2) Build app for simulator:
    - npm run e2e:build:ios
3) Run tests:
    - npm run e2e:test:ios

The suite e2e/login.e2e.js contains:

- Navigation to Login and empty submit validation (works offline)
- Optional real login when env vars are provided:
    - DETOX_E2E_LOGIN_EMAIL and DETOX_E2E_LOGIN_PASSWORD

Pointing the app to a Test Backend

- The app reads EXPO_PUBLIC_API_BASE_URL (see src/api/client.ts)
- Before prebuild/build: EXPO_PUBLIC_API_BASE_URL="https://test.example.com" npx expo prebuild -p ios && npm run e2e:
  build:ios

Folder Structure

- src/__tests__/ — component/screen tests
- src/__tests__/unit/ — pure logic tests
- e2e/ — Detox files (init.js, jest.config.js, login.e2e.js)

Acceptance Criteria Mapping

- npm test runs Jest successfully (logic + component test green)
- Detox baseline configured; simple Login E2E flows on iOS Simulator