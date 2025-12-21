import Foundation

class FeedViewModel: ObservableObject {
    @Published var items: [FeedItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient()

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
