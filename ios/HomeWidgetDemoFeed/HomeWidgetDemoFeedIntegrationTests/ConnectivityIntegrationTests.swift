import XCTest
@testable import HomeWidgetDemoFeed

final class ConnectivityIntegrationTests: XCTestCase {
    let client = APIClient()

    func testBackendHealth() async throws {
        // (1) E2E: iOS ↔ Backend Connectivity
        // Base URL kommt aus ENV via Config.swift
        do {
            try await client.checkHealth()
        } catch {
            XCTFail("Backend Health Check fehlgeschlagen: \(error)")
        }
    }
    
    func testTokenRoundtrip() async throws {
        // (3) E2E: Token aus iOS erzeugen + Backend validiert
        let uuid = UUID().uuidString
        let testEmail = "ios-test-\(uuid)@example.com"
        let testPassword = "securePassword123"
        
        do {
            // Signup
            _ = try await client.signup(email: testEmail, password: testPassword)
            
            // Login
            let tokens = try await client.login(email: testEmail, password: testPassword)
            XCTAssertFalse(tokens.access_token.isEmpty, "Access Token sollte nicht leer sein")
            
            // Me (Protected Endpoint)
            let me = try await client.fetchMe()
            XCTAssertEqual(me.email, testEmail, "Die E-Mail im Profil sollte übereinstimmen")
            
        } catch {
            XCTFail("Token Roundtrip fehlgeschlagen: \(error)")
        }
    }

    func testSuiteWorksProof() throws {
        XCTAssertTrue(true, "Suite works proof")
    }
}
