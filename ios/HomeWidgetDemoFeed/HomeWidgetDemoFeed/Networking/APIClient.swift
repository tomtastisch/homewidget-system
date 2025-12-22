import Foundation

/// Ein minimalistischer API-Client für den Zugriff auf Backend-Endpoints.
/// Die Basis-URL wird über die zentrale Konfiguration aufgelöst.
class APIClient {
    /// Ruft die aktuelle Seite des Demo-Feeds ab.
    /// - Returns: Eine Liste von Feed-Items bei Erfolg.
    /// - Throws: `APIError` bei Netzwerk-, Server- oder Dekodierungsfehlern.
    func fetchDemoFeed() async throws -> [FeedItem] {
        let baseURL = try Config.getApiBaseURL()
        // Konform zu HW-NEXT-07: /api/home/demo/feed_v1
        let url = baseURL.appendingPathComponent("api/home/demo/feed_v1")
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
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

    /// Prüft die Erreichbarkeit des Backends.
    /// - Throws: `APIError` bei Fehlern.
    func checkHealth() async throws {
        let baseURL = try Config.getApiBaseURL()
        let url = baseURL.appendingPathComponent("health")
        
        let (_, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }

    /// Registriert einen neuen Benutzer.
    func signup(email: String, password: String) async throws -> UserRead {
        let baseURL = try Config.getApiBaseURL()
        let url = baseURL.appendingPathComponent("api/auth/signup")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["email": email, "password": password]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(UserRead.self, from: data)
    }

    /// Authentifiziert den Benutzer.
    func login(email: String, password: String) async throws -> TokenPair {
        let baseURL = try Config.getApiBaseURL()
        let url = baseURL.appendingPathComponent("api/auth/login")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let bodyString = "username=\(email)&password=\(password)"
        request.httpBody = bodyString.data(using: .utf8)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let tokenPair = try JSONDecoder().decode(TokenPair.self, from: data)
        AuthManager.shared.saveTokens(access: tokenPair.access_token, refresh: tokenPair.refresh_token)
        return tokenPair
    }

    /// Ruft einen geschützten Endpoint auf (/api/auth/me).
    func fetchMe() async throws -> UserRead {
        let baseURL = try Config.getApiBaseURL()
        let url = baseURL.appendingPathComponent("api/auth/me")
        
        var request = URLRequest(url: url)
        if let token = AuthManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(UserRead.self, from: data)
    }
}
