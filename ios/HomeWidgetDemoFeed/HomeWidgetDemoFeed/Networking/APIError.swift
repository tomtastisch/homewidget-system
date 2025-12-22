import Foundation

/// Fehler, die beim Aufruf der entfernten API auftreten können.
enum APIError: Error, LocalizedError {
    /// Die konfigurierte API-URL ist ungültig oder kann nicht in eine `URL` umgewandelt werden.
    case invalidURL
    /// Die Antwort des Servers ist formal ungültig (z. B. unerwarteter HTTP-Status oder fehlende Daten).
    case invalidResponse
    /// Ein zugrunde liegender Netzwerkfehler ist aufgetreten (z. B. Verbindungsabbruch, Timeout).
    case networkError(Error)
    /// Die empfangenen Daten konnten nicht in die erwarteten Modelle dekodiert werden.
    case decodingError(Error)
    /// Der Server hat einen Fehlerstatuscode zurückgegeben (z. B. 4xx oder 5xx).
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Ungültige API URL. Bitte API_BASE_URL prüfen."
        case .invalidResponse: return "Ungültige Antwort vom Server."
        case .networkError(let error): return "Netzwerkfehler: \(error.localizedDescription)"
        case .decodingError(let error): return "Fehler beim Dekodieren der Daten: \(error.localizedDescription)"
        case .serverError(let code): return "Serverfehler (Status: \(code))"
        }
    }
}
