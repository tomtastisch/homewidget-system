import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = FeedViewModel()
    
    // MARK: - UI Konstanten
    private let priorityPadding: CGFloat = 6
    private let priorityCornerRadius: CGFloat = 8
    private let priorityBackgroundOpacity: Double = 0.1

    var body: some View {
        NavigationView {
            Group {
                if viewModel.isLoading {
                    ProgressView("Lade Feed...")
                } else if let errorMessage = viewModel.errorMessage {
                    VStack {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundColor(.red)
                        Text("Fehler beim Laden")
                            .font(.headline)
                        Text(errorMessage)
                            .font(.subheadline)
                            .multilineTextAlignment(.center)
                            .padding()
                        Button("Erneut versuchen") {
                            Task {
                                await viewModel.fetchFeed()
                            }
                        }
                    }
                } else {
                    List(viewModel.items) { item in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(item.name)
                                    .font(.headline)
                                HStack {
                                    Text("ID: \(item.id)")
                                    Text("•")
                                    Text(item.createdAt)
                                }
                                .font(.caption)
                                .foregroundColor(.secondary)
                            }
                            Spacer()
                            Text("Prio: \(item.priority)")
                                .font(.subheadline)
                                .padding(priorityPadding)
                                .background(Color.blue.opacity(priorityBackgroundOpacity))
                                .cornerRadius(priorityCornerRadius)
                        }
                    }
                }
            }
            .navigationTitle("ATom Demo Feed")
            .task {
                await viewModel.fetchFeed()
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
