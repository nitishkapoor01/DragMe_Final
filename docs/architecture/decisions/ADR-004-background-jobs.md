# ADR-004: Background Jobs & Media Processing Worker Architecture

## Status
Accepted

## Context
Media optimization (WebP re-encoding via Sharp, responsive variant generation, video poster extraction) is CPU- and memory-intensive. Executing these transformations synchronously inside the main Express HTTP request loop degrades API latency and can cause request timeouts under concurrent load.

## Decision
We decouple heavy media processing using an **Asynchronous Background Queue & Worker Abstraction**:

```
Client Upload
     │
     ▼
API Controller ──► StorageService.putTemp()
     │
     ▼
MediaQueue.addJob() ──► HTTP 200 { status: 'UPLOADING', jobId }
     │
     ▼ (Asynchronous)
Worker Pool (concurrency: 4)
     │
     ├── 1. Magic-byte verification & SVG sanitization
     ├── 2. SHA-256 deduplication
     ├── 3. Sharp WebP optimization / Poster generation
     ├── 4. StorageService.put() to permanent prefix
     └── 5. Update media_assets status = 'READY'
```

1. **Queue Abstraction (`services/mediaQueue.js`)**:
   - Manages task lifecycle (`UPLOADING` -> `PROCESSING` -> `READY` / `FAILED`).
   - Supports event hooks (`jobAdded`, `jobStarted`, `jobCompleted`, `jobFailed`).
   - Provides non-blocking concurrency control with periodic memory sweep.
2. **Worker Function (`services/mediaService.js`)**:
   - Registered to process jobs asynchronously.
   - Synchronous fallback option is supported for instant interactive uploads.
3. **Scaling Strategy**:
   - Single-instance / Development: In-process async queue (zero dependencies).
   - Multi-instance / Production: Swappable with Redis/BullMQ or AWS SQS without modifying controller code.

## Alternatives Considered
1. **Synchronous In-Loop Processing**:
   - *Rejected:* Blocks event loop, causes HTTP 504 timeouts on large files.
2. **Heavy Distributed Queue (Kafka/RabbitMQ) for Local Dev**:
   - *Rejected:* Over-engineering that complicates local setup.

## Consequences
### Positive
- Sub-50ms HTTP response times on uploads.
- Resilient error handling with failed status tracking.
- Independent scalability of worker compute.
