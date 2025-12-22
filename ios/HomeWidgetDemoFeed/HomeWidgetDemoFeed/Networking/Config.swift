import Foundation

/// Zentrale Konfigurationsverwaltung für den API-Zugriff.
/// Liest Umgebungsparameter aus der Info.plist des Bundles.
enum Config {
    /// Liefert die API-Basis-URL.
    /// Priorität:
    /// 1. Environment Variable `E2E_API_BASE_URL` (oder `API_BASE_URL`)
    /// 2. Info.plist Eintrag `API_BASE_URL` (der aus xcconfig kommt)
    /// - Returns: Die validierte Basis-URL für API-Anfragen.
    /// - Throws: `APIError.invalidURL`, wenn die Konfiguration fehlt oder ungültig ist.
    static func getApiBaseURL() throws -> URL {
        // 1. Suche in Environment (für CI/Tests)
        let env = ProcessInfo.processInfo.environment
        if let envUrlString = env["E2E_API_BASE_URL"] ?? env["API_BASE_URL"],
           let url = URL(string: envUrlString),
           url.host != nil {
            return url
        }

        // 2. Fallback auf Info.plist (xcconfig)
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
              let url = URL(string: urlString),
              url.host != nil else {
            throw APIError.invalidURL
        }
        return url
    }
}
// CI Trigger
