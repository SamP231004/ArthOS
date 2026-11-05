# ArthOS Web

This is the marketing site and web dashboard, built with Next.js 16, React Query, Zustand and Tailwind v4.

- `/` landing page · `/login` · `/register` · `/onboarding`
- `/dashboard` overview · `/dashboard/income` · `/dashboard/expenses` · `/dashboard/settings`

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3000
npm run build && npm run lint
```

**Vercel:** set Root Directory to `web` and `NEXT_PUBLIC_API_URL` to the backend URL.

The dashboard is client-rendered. The JWT is kept in `localStorage` and sent as a Bearer header, because the API is on a different origin.
