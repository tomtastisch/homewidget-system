from __future__ import annotations

from app.services.security import hash_password, verify_password

def test_hash_and_verify_password() -> None:
    plain = "S3cure!Passw0rd"
    hashed = hash_password(plain)

    assert hashed != plain
    assert hashed.startswith("$argon2")
    assert verify_password(plain, hashed) is True
    assert verify_password("wrong", hashed) is False
