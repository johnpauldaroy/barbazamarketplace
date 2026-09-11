# Deploy to Dokploy (`ekoopmart.coop`)

## 1) DNS

Create an `A` record for the apex domain:

- Host/Name: `@` (i.e. `ekoopmart.coop`)
- Value: `<your dokploy server public IP>`
- TTL: default

## 2) Create Dokploy Docker Compose project

In Dokploy, create a new **Docker Compose** project from your Git repository.

- Branch: your production branch (for example `main`)
- Compose File Path: `docker-compose.dokploy.yml`

This stack runs:
- `frontend` (React + Nginx on port `80`)
- `backend` (Laravel API on port `8000`, internal only)

## 3) Set required environment variable in Dokploy

Add this variable in the Compose project Environment tab:

- `APP_KEY=<your-laravel-app-key>`

Generate an APP_KEY locally if needed:

```bash
php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
```

## 4) Attach domain

- Domain: `ekoopmart.coop`
- Target Service: `frontend`
- Container Port: `80`
- Enable HTTPS/SSL (Let's Encrypt)

Save and redeploy.

## 5) API routing in this setup

`frontend` Nginx already proxies:
- `/api/*` -> `backend:8000/api/*`
- `/storage/*` -> `backend:8000/storage/*`

No separate API domain is required for this stack.

## 6) Verify

- Open `https://ekoopmart.coop`
- Check health endpoint: `https://ekoopmart.coop/health`
- Confirm browser Network tab shows successful `/api/...` requests.
