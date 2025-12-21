import Foundation

/// Repräsentiert eine Seite des Demo-Feeds inkl. Paginierungsinformationen.
///
/// - Note: Die Paginierung über `nextCursor` ist aktuell dekodiert, aber noch nicht in der UI implementiert.
struct FeedPage: Codable {
    /// Liste der in dieser Seite enthaltenen Feed-Einträge.
    let items: [FeedItem]
    /// Der Cursor für die nächste Seite, falls vorhanden (serverseitige Paginierung).
    let nextCursor: Int?

    enum CodingKeys: String, CodingKey {
        case items
        case nextCursor = "next_cursor"
    }
}

/// Repräsentiert ein einzelnes Widget-Teaser-Element im Feed.
struct FeedItem: Identifiable, Codable {
    /// Eindeutige ID des Elements.
    let id: Int
    /// Anzeigename des Widgets.
    let name: String
    /// Priorität für die Sortierung/Hervorhebung.
    let priority: Int
    /// Erstellungsdatum als String.
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case priority
        case createdAt = "created_at"
    }
}
