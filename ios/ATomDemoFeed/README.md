# ATom Demo Feed - iOS Client (SwiftUI)

Ein minimaler SwiftUI-Client zur Anzeige des Demo-Feeds.

## Voraussetzungen

- macOS mit Xcode 13.0 oder neuer.
- Ein konfigurierter Backend-Endpunkt.

## Konfiguration (API_BASE_URL)

Die Basis-URL der API wird über die Datei `Config.xcconfig` im Projekt-Root gesteuert.
Dort kann der Parameter `API_BASE_URL` angepasst werden.

Beispiel:
```
API_BASE_URL = http://localhost:8000/api/v1
```

Die `Info.plist` des Projekts referenziert diesen Wert, damit er zur Laufzeit über den `Config`-Service in Swift verfügbar ist.

## Starten im Simulator

1. Öffne `ATomDemoFeed.xcodeproj` in Xcode.
2. Wähle ein Simulator-Ziel (z.B. iPhone 14) aus dem Scheme-Menü.
3. Drücke `Cmd + R`, um die App zu bauen und zu starten.

## Architektur

- **SwiftUI**: Deklarative UI-Schicht.
- **ViewModel (ObservableObject)**: Trennung von View-Logik und Daten.
- **Networking**: `APIClient` nutzt `URLSession` mit `async/await`.
- **Fail-safe**: Die App crasht nicht bei Netzwerkfehlern, sondern zeigt einen Fallback-State mit Fehlermeldung und Retry-Option an.
