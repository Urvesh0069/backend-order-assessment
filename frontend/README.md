# OrderOps — Frontend

A React + TypeScript (Vite) console for the Orders backend. Clean white theme, fully interactive.

## Features

| Feature | Route | Backend endpoint |
| --- | --- | --- |
| Sign up | `/signup` | `POST /auth/signup` |
| Log in | `/login` | `POST /auth/login` |
| Dashboard (stats + recent uploads) | `/` | — (local history) |
| Upload orders (drag-and-drop, progress, result stats) | `/upload` | `POST /orders/upload-orders` |
| Find by Order ID | `/orders` | `GET /orders/:orderId` |
| Customer orders (history + lifetime value) | `/customers` | `GET /orders?customerId=` |

- JWT is stored in `localStorage` and attached as a `Bearer` token on every request.
- Protected routes redirect to `/login` when signed out.

## Getting started

```bash
# 1. Backend (in ../backend) — must be running on port 4000
cd ../backend && npm run dev

# 2. Frontend
npm install
npm run dev        # http://localhost:5173
```

## Configuration

`.env`:

```
VITE_API_BASE_URL=http://localhost:4000
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build

## Stack

React 18 · TypeScript · Vite · React Router · Axios — no UI framework; all styling is a hand-built design system in `src/index.css`.
