import Foundation

class APIClient {
    func fetchDemoFeed() async throws -> [FeedItem] {
        let baseURL = try Config.getApiBaseURL()
        let url = baseURL.appendingPathComponent("demo-feed")
        
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
}
