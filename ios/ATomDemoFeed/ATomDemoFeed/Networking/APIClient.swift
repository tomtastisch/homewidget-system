import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Ungültige API URL. Bitte API_BASE_URL prüfen."
        case .networkError(let error): return "Netzwerkfehler: \(error.localizedDescription)"
        case .decodingError(let error): return "Fehler beim Dekodieren der Daten: \(error.localizedDescription)"
        case .serverError(let code): return "Serverfehler (Status: \(code))"
        }
    }
}

class APIClient {
    func fetchDemoFeed() async throws -> [FeedItem] {
        let url = Config.apiBaseURL.appendingPathComponent("demo-feed")
        
        if url.host == "konfiguration-fehlt.local" {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError(NSError(domain: "Network", code: 0, userInfo: nil))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        do {
            let decoder = JSONDecoder()
            let page = try decoder.decode(FeedPage.self, from: data)
            return page.items
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
