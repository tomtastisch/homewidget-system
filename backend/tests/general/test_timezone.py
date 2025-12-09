from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlmodel import Session, create_engine, SQLModel

from app.services.auth_service import ensure_utc_aware, AuthService
from app.models.user import User
from app.models.widget import RefreshToken


def test_ensure_utc_aware_with_naive_datetime():
    """Test that ensure_utc_aware adds UTC timezone to naive datetimes."""
    now = datetime.now()
    naive_dt = datetime(now.year, now.month, now.day, 12, 0, 0)
    assert naive_dt.tzinfo is None
    
    aware_dt = ensure_utc_aware(naive_dt)
    
    assert aware_dt.tzinfo is not None
    assert aware_dt.tzinfo == UTC
    assert aware_dt.year == now.year
    assert aware_dt.month == now.month
    assert aware_dt.day == now.day


def test_ensure_utc_aware_with_aware_datetime():
    """Test that ensure_utc_aware preserves already timezone-aware datetimes."""
    now = datetime.now()
    aware_dt = datetime(now.year, now.month, now.day, 12, 0, 0, tzinfo=UTC)
    assert aware_dt.tzinfo == UTC
    
    result_dt = ensure_utc_aware(aware_dt)
    
    assert result_dt.tzinfo == UTC
    assert result_dt == aware_dt


def test_ensure_utc_aware_comparison():
    """Test that timezone-aware comparison works correctly after conversion."""
    # Simulate what happens in SQLite: datetime stored with timezone becomes naive on retrieval
    now_naive = datetime.now()
    stored_dt = datetime(now_naive.year, now_naive.month, now_naive.day, 12, 0, 0)  # Naive, as if from SQLite
    now = datetime.now(tz=UTC)
    
    # This would raise TypeError without ensure_utc_aware
    stored_aware = ensure_utc_aware(stored_dt)
    
    # Should not raise TypeError
    assert isinstance(stored_aware < now, bool)
    assert isinstance(stored_aware > now, bool)


def test_refresh_token_expiration_with_timezone_handling():
    """Test that refresh token expiration check handles timezone-naive datetimes from SQLite.
    
    This test specifically verifies the bug fix where SQLite strips timezone info
    from datetime fields, causing naive/aware comparison errors.
    """
    # Create in-memory test database
    engine = create_engine("sqlite://", echo=False)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Create a test user
        user = User(
            email="timezone-test@example.com",
            password_hash="dummy_hash",
            role="demo"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Create a refresh token with timezone-aware datetime
        expires_at = datetime.now(tz=UTC) + timedelta(hours=1)
        refresh_token = RefreshToken(
            user_id=user.id,
            token="test-token-12345",
            expires_at=expires_at  # Stored with timezone
        )
        session.add(refresh_token)
        session.commit()
        
        # Retrieve the token (simulates SQLite stripping timezone)
        retrieved_token = session.get(RefreshToken, refresh_token.id)
        assert retrieved_token is not None
        
        # SQLite may strip timezone info - verify our utility handles it
        # (behavior may vary by SQLite version/driver)
        expires_dt = ensure_utc_aware(retrieved_token.expires_at)
        now = datetime.now(tz=UTC)
        
        # This should not raise TypeError and should work correctly
        assert expires_dt > now  # Token not yet expired
        
        # Test with expired token
        expired_token = RefreshToken(
            user_id=user.id,
            token="expired-token-67890",
            expires_at=datetime.now(tz=UTC) - timedelta(hours=1)  # Already expired
        )
        session.add(expired_token)
        session.commit()
        
        retrieved_expired = session.get(RefreshToken, expired_token.id)
        assert retrieved_expired is not None
        
        expired_dt = ensure_utc_aware(retrieved_expired.expires_at)
        assert expired_dt < now  # Token is expired


def test_auth_service_handles_naive_refresh_token_expiration():
    """Integration test: AuthService.rotate_refresh handles timezone-naive datetimes from database."""
    # Create in-memory test database
    engine = create_engine("sqlite://", echo=False)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Create a test user
        user = User(
            email="auth-service-tz@example.com",
            password_hash="dummy_hash",
            role="common",
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Create an expired refresh token (naive datetime to simulate SQLite)
        expired_token = RefreshToken(
            user_id=user.id,
            token="expired-refresh-token",
            expires_at=datetime.now() - timedelta(days=30),  # Naive, in the past
            revoked=False
        )
        session.add(expired_token)
        session.commit()
        
        # AuthService should handle the naive datetime without crashing
        auth_service = AuthService(session)
        
        # Should raise HTTPException for expired token, not TypeError
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            auth_service.rotate_refresh("expired-refresh-token")
        
        assert exc_info.value.status_code == 401
        assert "invalid refresh token" in exc_info.value.detail.lower()
