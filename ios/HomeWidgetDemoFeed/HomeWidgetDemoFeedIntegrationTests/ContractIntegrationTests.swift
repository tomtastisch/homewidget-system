import XCTest
@testable import HomeWidgetDemoFeed

final class ContractIntegrationTests: XCTestCase {
    let client = APIClient()

    func testContractIdentity() async throws {
        // (2) Contract/E2E: "Mobile Daten == iOS Daten"
        let baseURL = try Config.getApiBaseURL()
        let url = baseURL.appendingPathComponent("api/home/demo/feed_v1")
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            XCTFail("Konnte Feed für Contract nicht laden")
            return
        }
        
        // JSON kanonisieren (Keys sortieren)
        let jsonObject = try JSONSerialization.jsonObject(with: data)
        let canonicalData = try JSONSerialization.data(withJSONObject: sortObject(jsonObject), options: [.sortedKeys])
        let canonicalString = String(data: canonicalData, encoding: .utf8) ?? ""
        
        // Output für CI (deterministiach mit Marker)
        print("---BEGIN CANONICAL FEED (iOS)---")
        print(canonicalString)
        print("---END CANONICAL FEED (iOS)---")
    }
    
    /// Hilfsfunktion zum rekursiven Sortieren von Dictionary-Keys (nicht zwingend nötig bei .sortedKeys, aber sicherer)
    private func sortObject(_ obj: Any) -> Any {
        if let dict = obj as? [String: Any] {
            var sortedDict = [String: Any]()
            for key in dict.keys.sorted() {
                sortedDict[key] = sortObject(dict[key]!)
            }
            return sortedDict
        } else if let array = obj as? [Any] {
            return array.map { sortObject($0) }
        }
        return obj
    }
}
