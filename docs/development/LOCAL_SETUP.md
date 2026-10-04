# Local Development Setup

This guide provides step-by-step instructions to set up, run, and test DRAGME on your local machine.

---

## Prerequisites
- **Node.js**: v20.0.0 or higher (v22+ recommended for native SQLite WAL support)
- **npm**: v10.0.0 or higher
- **Git**

---

## Quick Start (Zero External Dependencies)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dragme/dragme.git
   cd dragme
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(By default, leaving `DATABASE_URL` empty automatically enables the high-performance local SQLite WAL engine.)*

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:5173](http://localhost:5173).

---

## Running Automated Tests

Run the complete test suite (Media Pipeline + Master API Integration):
```bash
npm test
```

### Run specific suites:
- **Media Pipeline & Storage Suite:**
  ```bash
  node tests/test-media-pipeline.js
  ```
- **Master API Contract Suite:**
  ```bash
  node tests/test-api-suite.js
  ```
- **Crown Reactions Test:**
  ```bash
  node tests/test-crown-reaction.js
  ```

---

## Default Seed Credentials

For local testing, the server automatically seeds a default power user:
- **Username:** `tester`
- **Password:** `password123`
- **Role:** `user` (Senior Roaster)
