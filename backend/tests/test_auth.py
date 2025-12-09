"""Tests for authentication endpoints (Ticket 3-E requirements)."""

from fastapi.testclient import TestClient


def test_register_happy_path(client: TestClient) -> None:
    """Test successful user registration (POST /auth/register)."""
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "SecurePassword123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_signup_endpoint_works(client: TestClient) -> None:
    """Test that /signup endpoint also works (not just /register)."""
    response = client.post(
        "/api/auth/signup",
        json={"email": "signup@example.com", "password": "SecurePassword123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "signup@example.com"
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client: TestClient) -> None:
    """Test that registering with duplicate email returns 409 Conflict."""
    # First registration
    client.post(
        "/api/auth/register",
        json={"email": "duplicate@example.com", "password": "SecurePassword123!"},
    )

    # Second registration with same email
    response = client.post(
        "/api/auth/register",
        json={"email": "duplicate@example.com", "password": "AnotherPassword123!"},
    )

    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()


def test_register_invalid_email(client: TestClient) -> None:
    """Test that registering with invalid email returns 422 Unprocessable Entity."""
    response = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "SecurePassword123!"},
    )

    assert response.status_code == 422


def test_login_happy_path(client: TestClient) -> None:
    """Test successful login (POST /auth/login) with OAuth2 Password Flow."""
    # Register a user first
    client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "SecurePassword123!"},
    )

    # Login with OAuth2 Password Flow (form data)
    response = client.post(
        "/api/auth/login",
        data={"username": "login@example.com", "password": "SecurePassword123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data
    assert "role" in data
    # Verify tokens are not empty
    assert len(data["access_token"]) > 0
    assert len(data["refresh_token"]) > 0


def test_login_invalid_credentials(client: TestClient) -> None:
    """Test that login with wrong password returns 401 Unauthorized."""
    # Register a user first
    client.post(
        "/api/auth/register",
        json={"email": "wrongpass@example.com", "password": "SecurePassword123!"},
    )

    # Try to login with wrong password
    response = client.post(
        "/api/auth/login",
        data={"username": "wrongpass@example.com", "password": "WrongPassword123!"},
    )

    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


def test_login_nonexistent_user(client: TestClient) -> None:
    """Test that login with non-existent user returns 401 Unauthorized."""
    response = client.post(
        "/api/auth/login",
        data={"username": "nonexistent@example.com", "password": "SomePassword123!"},
    )

    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


def test_refresh_token_flow(client: TestClient) -> None:
    """Test refresh token endpoint (POST /auth/refresh)."""
    # Register and login to get tokens
    client.post(
        "/api/auth/register",
        json={"email": "refresh@example.com", "password": "SecurePassword123!"},
    )

    login_response = client.post(
        "/api/auth/login",
        data={"username": "refresh@example.com", "password": "SecurePassword123!"},
    )
    refresh_token = login_response.json()["refresh_token"]

    # Use refresh token to get new tokens
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    # New tokens should be different from old ones
    assert data["refresh_token"] != refresh_token


def test_refresh_token_invalid(client: TestClient) -> None:
    """Test that invalid refresh token returns 401 Unauthorized."""
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": "invalid-token-12345"},
    )

    assert response.status_code == 401


def test_me_endpoint_with_valid_token(client: TestClient) -> None:
    """Test /auth/me endpoint with valid access token."""
    # Register and login
    client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "SecurePassword123!"},
    )

    login_response = client.post(
        "/api/auth/login",
        data={"username": "me@example.com", "password": "SecurePassword123!"},
    )
    access_token = login_response.json()["access_token"]

    # Call /auth/me with token
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert "id" in data
    assert "password" not in data


def test_me_endpoint_without_token(client: TestClient) -> None:
    """Test /auth/me endpoint without token returns 401."""
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_endpoint_with_invalid_token(client: TestClient) -> None:
    """Test /auth/me endpoint with invalid token returns 401."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token-12345"},
    )

    assert response.status_code == 401
