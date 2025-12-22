import Foundation

/// Steuert den Zustand und die Logik für die Anzeige des Demo-Feeds.
/// Kommuniziert mit dem APIClient und bereitet Daten für die UI auf.
class FeedViewModel: ObservableObject {
    @Published var items: [FeedItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient()

    /// Startet den asynchronen Ladevorgang der Feed-Daten.
    /// Aktualisiert den Ladezustand und behandelt mögliche Fehler.
    @MainActor
    func fetchFeed() async {
        isLoading = true
        errorMessage = nil
        
        do {
            items = try await apiClient.fetchDemoFeed()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}
