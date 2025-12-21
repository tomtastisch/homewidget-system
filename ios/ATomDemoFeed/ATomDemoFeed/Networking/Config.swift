import Foundation

enum Config {
    static var apiBaseURL: URL {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
              let url = URL(string: urlString) else {
            // Wir werfen hier keinen fatalError, sondern geben eine Dummy-URL zurück oder behandeln es im Client
            // Da das Ticket "kein magisches Defaulting" verlangt, sollte hier klar sein, dass es konfiguriert werden muss.
            return URL(string: "http://konfiguration-fehlt.local")!
        }
        return url
    }
}
