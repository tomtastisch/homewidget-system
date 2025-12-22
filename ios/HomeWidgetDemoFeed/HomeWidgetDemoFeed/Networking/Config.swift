import Foundation

/// Zentrale Konfigurationsverwaltung für den API-Zugriff.
/// Liest Umgebungsparameter aus der Info.plist des Bundles.
enum Config {
    /// Liefert die API-Basis-URL aus der Info.plist.
    /// - Returns: Die validierte Basis-URL für API-Anfragen.
    /// - Throws: `APIError.invalidURL`, wenn die Konfiguration fehlt oder ungültig ist.
    static func getApiBaseURL() throws -> URL {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
              let url = URL(string: urlString),
              url.host != nil else {
            throw APIError.invalidURL
        }
        return url
    }
}
