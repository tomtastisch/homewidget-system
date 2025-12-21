import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case networkError(Error)
    case decodingError(Error)
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
