import Foundation

/// Verwaltet die Authentifizierungstoken.
/// In dieser Phase minimalistisch in-memory implementiert.
class AuthManager {
    static let shared = AuthManager()
    
    private var accessToken: String?
    private var refreshToken: String?
    
    private init() {}
    
    /// Speichert die Token.
    /// - Parameters:
    ///   - access: Das Access Token.
    ///   - refresh: Das Refresh Token (optional).
    func saveTokens(access: String, refresh: String?) {
        self.accessToken = access
        self.refreshToken = refresh
    }
    
    /// Liefert das aktuelle Access Token.
    func getAccessToken() -> String? {
        return accessToken
    }
    
    /// Löscht alle Token.
    func clear() {
        accessToken = nil
        refreshToken = nil
    }
    
    /// Gibt an, ob der User (lokal) eingeloggt ist.
    var isAuthenticated: Bool {
        return accessToken != nil
    }
}
