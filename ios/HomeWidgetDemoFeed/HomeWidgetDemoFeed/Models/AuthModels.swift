import Foundation

/// Token-Paar vom Backend.
struct TokenPair: Codable {
    let access_token: String
    let refresh_token: String
    let expires_in: Int
    let role: String
}

/// Benutzerinformationen.
struct UserRead: Codable {
    let id: UUID
    let email: String
    let role: String
}
