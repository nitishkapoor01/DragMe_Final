# ADR-001: Modular Monolith with Clear Infrastructure Boundaries

## Status
Accepted

## Context
DRAGME is a next-generation community and social platform designed to support high-energy discussions, roasts, anonymous confessions, media sharing, crown reactions, and interactive rooms. As a fast-evolving product, it must:
1. Allow 1 developer or a small team to run, test, and iterate on minimal/free hardware (e.g., local Node.js + SQLite WAL or a $5 VPS).
2. Scale horizontally across multiple instances behind a load balancer as traffic increases to millions of users.
3. Prevent premature microservices complexity (distributed transactions, network latencies, multiple deployment pipelines, service meshes).
4. Provide clean separation between domain logic and infrastructure concerns.

## Decision
We adopt a **Modular Monolith** architecture with strict layer boundaries:
- **Presentation Layer (`src/`)**: Canonical ES Module frontend bootstrap (`src/main.js`), with distinct platform presentations (`platforms/desktop/`, `platforms/mobile/`) sharing unified core business logic, APIs, and state (`src/app/store.js`).
- **HTTP Routing Layer (`backend/routes/`)**: Express routers encapsulating URI paths, validation middleware, and rate limiters.
- **Controller Layer (`backend/controllers/`)**: HTTP protocol parsing, status code serialization, and response envelopes.
- **Service Layer (`backend/services/` & `services/`)**: Pure domain business logic and compute engines (media processing, reaction aggregation, authentication).
- **Repository Layer (`backend/repositories/`)**: Database persistence operations with parameterized SQL.
- **Database Abstraction (`db.js`)**: Dual-engine interface supporting SQLite WAL for zero-config local development and PostgreSQL Connection Pooling (`pg.Pool`) for cloud scale.
- **Infrastructure Services (`services/`)**: Pluggable storage and background job queues.

## Alternatives Considered
1. **Microservices (Auth Service, Post Service, Media Service, Feed Service)**:
   - *Rejected:* High operational overhead, premature optimization, complex orchestration, slower developer iteration speed.
2. **Monolithic Spaghetti (Single file / Unlayered Express + Legacy jQuery/DOM mixing)**:
   - *Rejected:* Unmaintainable, untestable, impossible for multiple developers to collaborate without merge conflicts.

## Consequences
### Positive
- **High Developer Velocity:** Easy to clone, run `npm start` or `npm test`, and develop features locally in seconds.
- **Horizontal Portability:** Can be deployed to Heroku, Render, AWS ECS, GCP Cloud Run, DigitalOcean, or standard Docker containers.
- **Single Source of Truth:** Business rules (e.g., anonymous masking, crown reaction limits) are implemented once in the service layer.
- **Future Extraction Path:** If a specific subsystem (e.g., heavy video transcoding) requires independent scaling, it already has clean boundaries and can be deployed as an isolated worker container.

### Negative / Trade-offs
- Developers must respect layer boundaries and not execute raw SQL inside controllers or UI files.
