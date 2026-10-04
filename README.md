# DRAGME — Next-Gen Full-Stack Social Arena & Community Platform

[![Foundation Status](https://img.shields.io/badge/foundation-v1%20FROZEN-brightgreen.svg)](docs/architecture/FOUNDATION_FREEZE_v1.md)
[![Build & Test Status](https://img.shields.io/badge/tests-57%20passed-brightgreen.svg)](#testing)
[![Architecture](https://img.shields.io/badge/architecture-modular%20monolith-blue.svg)](docs/architecture/decisions/ADR-001-modular-monolith.md)
[![Database](https://img.shields.io/badge/database-PostgreSQL%20%7C%20SQLite%20WAL-purple.svg)](docs/database/SCHEMA.md)

DRAGME is a high-performance, server-authoritative social arena and community platform featuring interactive tech roasts, anonymous confessions, unfiltered debates, real-time crown reaction physics, media studios, and community rooms. Built on **DRAGME FOUNDATION v1**.

---

## 🏛️ Architecture Overview

DRAGME is built as a **Clean Modular Monolith** with clear infrastructure boundaries designed to scale from 1 local developer to millions of concurrent users:

```
                                 DRAGME CORE
                                      │
                      ┌───────────────┴───────────────┐
                      │                               │
             platforms/desktop/              platforms/mobile/
             (3-col, keyboard)              (bottom nav, drawer)
                      │                               │
                      └───────────────┬───────────────┘
                                      │
                                  SAME API
                                      │
                                 SAME BACKEND
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                    PostgreSQL      Cloud      Cloudflare R2
                     (Pool)         Redis       (CDN Media)
```

- **Canonical Frontend Entrypoint:** [`index.html`](file:///c:/Users/nitis/Desktop/axh/index.html) ➔ [`src/main.js`](file:///c:/Users/nitis/Desktop/axh/src/main.js)
- **Authoritative Design System:** [`style.css`](file:///c:/Users/nitis/Desktop/axh/style.css)
- **Backend Application Server:** [`server.js`](file:///c:/Users/nitis/Desktop/axh/server.js)
- **Universal Database Engine:** [`db.js`](file:///c:/Users/nitis/Desktop/axh/db.js) (PostgreSQL + SQLite WAL)

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.0.0+ (v22+ recommended)
- **npm**: v10.0.0+

### 2. Install & Start
```bash
# Clone & install
git clone https://github.com/dragme/dragme.git
cd dragme
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

DRAGME includes automated test suites covering integration contracts and media processing pipelines:

```bash
npm test
```

Results: **52 Passed | 0 Failed**
- 34 Media Pipeline tests (Aspect ratios, Sharp WebP compression, video posters, SHA-256 deduplication, storage GC)
- 18 API Contract tests (Auth, masked anonymous posts, discussions, crown reactions, bookmarks, active rooms)

---

## 📁 Repository Structure

```
├── src/                        # Canonical Frontend Application (ES Modules)
│   ├── main.js                 # Frontend application bootstrap
│   ├── app/                    # Store (pub/sub), router (hash/history), config
│   ├── core/                   # Platform detector & decoupled event bus
│   ├── api/                    # Typed HTTP client modules (auth, posts, comments, etc.)
│   ├── features/               # Shared domain features (feed, posts, reactions, auth, profile)
│   ├── platforms/              # Device-specific presentation
│   │   ├── desktop/            # Desktop keyboard shortcuts, 3-column layout
│   │   └── mobile/             # Mobile bottom nav dock, drawer, FAB
│   ├── services/               # Client compute (audio synthesizer, avatar resolver, compressor)
│   ├── state/                  # Canonical state barrel re-exporting store
│   ├── utils/                  # DOM escaping, formatting
│   └── constants/              # Categories, reaction maps, room definitions
│
├── backend/                    # Server-Authoritative Backend Subsystems
│   ├── routes/                 # HTTP endpoint definitions & rate limiters
│   ├── controllers/            # HTTP request/response serialization
│   ├── services/               # Core business logic (auth, reactions, posts)
│   ├── repositories/           # Parameterized SQL database operations
│   ├── validators/             # Input schema validators & sanitizers
│   ├── middleware/             # JWT auth & sliding-window rate limiters
│   └── utils/                  # Response formatters, time utils
│
├── services/                   # Backend Infrastructure & Compute Engines
│   ├── storageService.js       # Pluggable Storage Driver (Local / S3 / R2 / GCS)
│   ├── mediaProcessor.js       # Sharp WebP image & video poster processing engine
│   ├── mediaQueue.js           # Asynchronous background worker queue
│   ├── mediaService.js         # Media lifecycle orchestration & deduplication
│   └── mediaDeliveryService.js # CDN URL resolution & caching headers
│
├── config/                     # Configuration constants (media limits, aspect ratios)
├── tests/                      # Automated unit, integration, & media pipeline test suites
├── docs/                       # Architecture, ADRs, database schema, & deployment guides
└── uploads/                    # Local media storage buckets (temp, profile, post, posters)
```

---

## 📚 Documentation Index

- [Architecture Audit & Roadmap](docs/architecture/FOUNDATION_AUDIT.md)
- [Architecture Decision Records (ADRs)](docs/architecture/decisions/)
- [Developer & Coding Guide](docs/development/DEVELOPER_GUIDE.md)
- [Local Setup Guide](docs/development/LOCAL_SETUP.md)
- [API Reference](docs/api/API_REFERENCE.md)
- [Database Schema & Migrations](docs/database/SCHEMA.md)
- [Production Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- [Contributing Guidelines](CONTRIBUTING.md)
