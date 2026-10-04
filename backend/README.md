# DRAGME Backend Architecture (`backend/`)

This directory contains the server-authoritative backend layers for the DRAGME Modular Monolith.

---

## Architecture & Layering

```
HTTP Request ──► routes/ ──► middleware/ ──► controllers/ ──► validators/ ──► services/ ──► repositories/ ──► db.js
```

### Directory Responsibilities
- **`routes/`**: Endpoint path declarations, attaching rate limiters and auth middleware.
- **`middleware/`**: Cross-cutting concerns:
  - `authMiddleware.js`: JWT signature verification, role enforcement (`requireAuth`, `requireAdmin`).
  - `rateLimiter.js`: Memory-safe sliding-window rate limiters with automatic garbage collection.
- **`controllers/`**: HTTP transport concerns: parsing `req.body`, `req.params`, `req.query`, and returning standard JSON status envelopes.
- **`validators/`**: Input validation, string sanitization, and length limits.
- **`services/`**: Business rules, state transitions, reaction computations, and user permissions.
- **`repositories/`**: Database persistence via prepared parameterized SQL statements.
- **`utils/`**: Standard error/success response serialization (`responseUtils.js`) and timestamp helpers (`timeUtils.js`).

---

## Security Invariants
- User ID is derived exclusively from the verified JWT payload (`req.user.id`), never trusted from client request bodies.
- Anonymous mode strictly masks author details server-side before returning post or comment payloads.
- All database operations use parameterized statements to eliminate SQL injection vulnerabilities.
