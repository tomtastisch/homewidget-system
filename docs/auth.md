# Auth – Token Blacklist & Cache Integration (Ticket 5-E)

This document explains the access token blacklist (revocation) mechanism added in Ticket 5‑E, the cache decision, behavior, limitations, and logging.

## Summary

- Access tokens now include a `jti` (UUID4) claim.
- A lightweight blacklist is implemented using the project’s existing `fastapi-cache2` backend (InMemory in dev).
- Tokens can be revoked by blacklisting their `jti` until the token’s natural expiry.
- A new endpoint `POST /api/auth/logout` revokes the current access token.
- Validation order stays the same: signature/exp are checked first, then the blacklist.

## Design Details

### JTI Claim

- Access tokens carry a `jti` (unique token ID) generated via UUID4.
- Claim set example for access tokens:
  ```json
  { "sub": "user@example.com", "type": "access", "exp": 1735737600, "jti": "...uuid4..." }
  ```
- Refresh tokens remain backed by the database (opaque tokens in `refresh_tokens` table) and are not yet using `jti` in this ticket.

### Blacklist Backend Choice

- Reused the existing `fastapi-cache2` backend, initialized in `backend/app/main.py` with `InMemoryBackend` for dev.
- Blacklist keys use a dedicated namespace/prefix: `token_blacklist:{jti}`.
- Stored value is a small truthy byte string (`b"1"`) with a TTL aligned to the token’s remaining lifetime.

Rationale:

- PoC‑friendly, zero extra dependencies, minimal integration overhead.
- Consistent with existing caching usage (home feed caching).

Limitations:

- In-memory backend is not persistent and not cluster‑ready.
- Entries are lost on process restart.
- Not suitable for multi‑instance deployments without a shared backend (e.g., Redis). A future ticket could switch the backend.

### Failure Behavior (Cache Unavailable)

- The blacklist layer is designed to fail‑open:
  - If the cache backend is unavailable at set/get time, the system logs a warning and treats the token as not blacklisted.
  - Reasoning: Access tokens are short‑lived and refresh tokens (DB‑backed) remain the source of truth; prioritizing API availability.

This behavior is explicitly tested and documented to avoid surprises.

## API Integration

### Validation Flow

1. Decode/verify JWT signature and expiry.
2. Ensure token `type == "access"` and that `jti` is present.
3. Check blacklist: if the `jti` is found, reject with 401 using the same generic message as other invalid tokens ("Invalid token"). This avoids leaking revocation status and keeps behavior consistent.

This logic lives in the central dependency `get_current_user`.

### Logout / Revocation Endpoint

- `POST /api/auth/logout`
  - Extracts the presented access token via OAuth2 bearer auth.
  - Reads `jti` and `exp` from the token payload.
  - Blacklists the `jti` with a TTL calculated as `exp - now` (never shorter than 0 seconds).
  - Returns `204 No Content`.
- Scope: Only the current access token is revoked. Refresh tokens remain valid (managed by DB, revocation/rotation already implemented). A later ticket can add session‑wide revocation if desired.

## Implementation Notes

- Module: `backend/app/services/token_blacklist.py`
  - `blacklist_access_token(jti: str, expires_at: datetime) -> None`
  - `is_access_token_blacklisted(jti: str) -> bool`
  - Uses `ensure_utc_aware` to avoid naive/aware datetime issues.
- Security:
  - Access tokens now include `jti` (see `backend/app/services/security.py`).
  - Dependency `get_current_user` performs the blacklist check after signature/exp validation.

## Testing

New tests cover:

- Blacklisted token is rejected; non‑blacklisted token remains valid.
- TTL behavior ensures blacklist entry lives until token expiry (checked via time freezing).
- Logout endpoint blacklists only the presented token; another token for the same user still works.
- Cache failure scenario leads to fail‑open behavior (token still accepted, endpoint returns 204).

All existing tests remain green. Type checks and linting pass.

## Logging

The following events are logged to aid debugging and security auditing without exposing sensitive data:

- `token_blacklisted` (services.token_blacklist): when a `jti` is added to the blacklist, including TTL seconds.
- `token_blacklist_hit` (services.token_blacklist): when a presented access token `jti` is found in the blacklist.
- `blacklist_set_failed` / `blacklist_get_failed` / `blacklist_no_cache_backend` (services.token_blacklist): when the cache backend is unavailable or operations fail; the system follows fail‑open semantics.
- `logout_revoked_access_token` (api.auth): after a logout request successfully blacklists the current access token.

Notes:
- Logs include the `jti` but never the JWT or user secrets.
- InMemory cache backend implies logs reflect per‑process behavior only (no cluster‑wide guarantees in PoC).

## Future Improvements

- Switch to a shared cache (e.g., Redis) for persistence and clustering.
- Add optional refresh‑token blacklisting or session‑wide revocation.
- Introduce per‑user or per‑session logout affecting all active access tokens if required by product policy.
