import Foundation

struct FeedPage: Codable {
    let items: [FeedItem]
    let nextCursor: Int?
    
    enum CodingKeys: String, CodingKey {
        case items
        case nextCursor = "next_cursor"
    }
}

struct FeedItem: Identifiable, Codable {
    let id: Int
    let name: String
    let priority: Int
    
    var title: String { name } // Alias für Abwärtskompatibilität in der UI
}
