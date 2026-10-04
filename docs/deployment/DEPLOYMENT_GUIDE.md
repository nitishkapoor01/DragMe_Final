# Production Deployment Guide

DRAGME is designed for horizontal portability. It can run on minimal single-instance cloud providers (Render, Railway, Fly.io, DigitalOcean) as well as horizontally scaled container clusters (AWS ECS, Google Cloud Run, Kubernetes).

---

## 1. Environment Variables Reference

| Variable | Description | Default / Example | Required in Production |
|---|---|---|---|
| `PORT` | HTTP Server port | `5173` | Yes (often set by host) |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/dragme` | Yes (for multi-instance) |
| `JWT_SECRET` | Secret key for signing auth tokens | *(Cryptographically random 64-char string)* | **Yes** |
| `STORAGE_PROVIDER` | Object storage driver (`local`, `s3`, `r2`, `gcs`) | `local` | Recommended (`s3` or `r2`) |
| `CDN_BASE_URL` | Public CDN URL for media | `https://cdn.dragme.gg` | Optional |
| `S3_BUCKET_NAME` | S3 bucket for media storage | `dragme-media-bucket` | If using S3/R2 |
| `AWS_ACCESS_KEY_ID` | Cloud storage access key | `AKIA...` | If using S3 |
| `AWS_SECRET_ACCESS_KEY` | Cloud storage secret | `...` | If using S3 |

---

## 2. Docker Deployment

A production-ready `Dockerfile` and `docker-compose.yml` are included in the root directory.

### Build and Run with Docker Compose:
```bash
docker-compose up --build -d
```

### Build and Run standalone container:
```bash
docker build -t dragme-app:latest .
docker run -p 5173:5173 -e DATABASE_URL="postgres://..." -e JWT_SECRET="your_secret" dragme-app:latest
```

---

## 3. Horizontal Scaling Architecture

In a multi-instance production environment:

```
                  Internet / Users
                         │
                         ▼
                Cloudflare CDN / WAF
                         │
                         ▼
               Application Load Balancer
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
        DRAGME #1    DRAGME #2    DRAGME #3
        (Container)  (Container)  (Container)
            │            │            │
            ├────────────┼────────────┤
            │            │            │
            ▼            ▼            ▼
       PostgreSQL      Cloud      Cloudflare
     Connection Pool   Redis      R2 / S3
        (pg.Pool)     (Queue)     (Storage)
```

1. **Stateless App Nodes:** Any instance can serve any HTTP request because authentication is stateless JWT and database connections are pooled.
2. **Shared Storage:** All instances read/write permanent media assets via Cloudflare R2 / AWS S3.
3. **Database:** Managed PostgreSQL (AWS RDS / Supabase / Neon) handles persistent data with automated index optimization.
