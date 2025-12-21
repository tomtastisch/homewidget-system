import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = FeedViewModel()

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
                                .padding(6)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
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
