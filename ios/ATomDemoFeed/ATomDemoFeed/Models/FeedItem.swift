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
    let createdAt: String
    
    var title: String { name }
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case priority
        case createdAt = "created_at"
    }
}
