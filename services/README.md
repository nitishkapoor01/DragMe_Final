# DRAGME Infrastructure & Compute Engines (`services/`)

This directory contains pluggable infrastructure services, background worker queues, and media compute engines.

---

## Services Overview

- **`storageService.js`**: Pluggable storage driver supporting `local` disk storage, Cloudflare `r2`, AWS `s3`, and Google Cloud Storage `gcs`. Resolves public CDN URLs and handles temporary uploads and permanent storage.
- **`mediaProcessor.js`**: High-performance image optimization using `sharp`. Cropping for portrait PFPs (4:5), banners (3:1), generating responsive multi-resolution WebP variants, and extracting video poster fallback frames.
- **`mediaQueue.js`**: Non-blocking asynchronous worker queue decoupling heavy media processing from the HTTP request cycle.
- **`mediaService.js`**: Coordinates media validation, magic-byte checking, SHA-256 deduplication, attachment to entities (`media_usages`), and storage garbage collection.
- **`mediaDeliveryService.js`**: Provides CDN URLs and response headers for static and dynamic media assets.
