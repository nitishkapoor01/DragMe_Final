# ADR-003: Universal Cloud & Local Storage Abstraction

## Status
Accepted

## Context
DRAGME allows users to upload profile avatars (up to 4:5 portrait WebP/video), profile banners (3:1 WebP/video), post images (multi-variant responsive WebP), and post videos (native MP4 with static WebP poster frames).

Directly coupling backend business logic to local filesystem paths (`fs.writeFile`) causes severe issues:
1. In multi-instance cloud deployments (AWS ECS, Kubernetes, Fly.io, Railway), local files are ephemeral and not shared across containers.
2. In production, assets must be served via high-speed CDNs (Cloudflare, AWS CloudFront) and stored in object storage (AWS S3, Cloudflare R2, Google Cloud Storage).
3. In local development, developers must be able to run the app offline without needing cloud API credentials.

## Decision
We implement a **Pluggable Storage Driver Abstraction** encapsulated in [`services/storageService.js`](file:///c:/Users/nitis/Desktop/axh/services/storageService.js):

1. **Clean Key Interface**:
   - `putTemp(buffer, filenameHint)`: Saves ephemeral upload before validation.
   - `put(buffer, storageKey)`: Stores permanent optimized media.
   - `getBuffer(storageKey)`: Retrieves media buffer for processing.
   - `delete(storageKey)`: Deletes asset from storage.
   - `getPublicUrl(storageKey)`: Generates public CDN URL or relative URL.
   - `listPrefix(prefix)`: Lists assets for garbage collection.
2. **Environment Configuration**:
   - `STORAGE_PROVIDER`: `local` (default) | `s3` | `r2` | `gcs`.
   - `CDN_BASE_URL`: Optional custom CDN prefix (e.g. `https://cdn.dragme.gg`).
3. **Database Independence**:
   - Raw binary blobs are **NEVER** stored in PostgreSQL or SQLite.
   - Only storage keys, CDN URLs, MIME types, content hashes, and dimensions are stored in `media_assets`.

## Alternatives Considered
1. **Storing Base64 strings or BLOBs in PostgreSQL**:
   - *Rejected:* Bloats database size, degrades query performance, exhausts memory.
2. **Direct Hardcoded S3 SDK Calls in Routes**:
   - *Rejected:* Breaks local offline development and locks the application to AWS.

## Consequences
### Positive
- Fully portable: runs locally on disk out of the box; switches to S3/R2 by setting environment variables.
- Enables high-performance immutable CDN caching (`Cache-Control: public, max-age=2592000, immutable`).
- Easy automated garbage collection of unreferenced/orphaned files.
