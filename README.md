# 🌿 AgriPulse v2.0 — Modern Stack

> Dairy farm management system rebuilt with TypeScript, Node.js, React, Prisma, and JWT auth.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | React + TypeScript + Tailwind CSS |
| Database | MySQL via Prisma ORM |
| Auth | JWT + bcrypt + HttpOnly cookies |
| Google OAuth | Native OAuth 2.0 (no passport) |
| Email | Nodemailer + Resend |
| AI Advisor | Anthropic Claude SDK |
| Security | Helmet, CORS, rate limiting, Zod validation |

---

## Quick Start

### 1. Install dependencies

```bash
# Root (server)
npm install

# Frontend
cd client && npm install && cd ..
```

### 2. Set up environment

```bash
cp .env.example .env
```

Then edit `.env` with your values:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
JWT_SECRET="generate-with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
GOOGLE_CLIENT_ID="from Google Cloud Console"
GOOGLE_CLIENT_SECRET="from Google Cloud Console"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
RESEND_API_KEY="from resend.com"
MAIL_FROM="AgriPulse <noreply@yourdomain.com>"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
ANTHROPIC_API_KEY="from console.anthropic.com"
```

### 3. Set up database

```bash
# Push schema to your MySQL database
npm run db:push

# (Optional) Open visual DB editor
npm run db:studio
```

### 4. Run development

```bash
npm run dev
```

- API: http://localhost:5000
- Frontend: http
://localhost:5173

---

## Google OAuth Setup (5 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Credentials**
3. Click **Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Add Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy `Client ID` and `Client Secret` to your `.env`

For production, add your live domain as an additional redirect URI.

---

## Resend Email Setup (2 minutes)

1. Go to [resend.com](https://resend.com) → Sign up free
2. Go to **API Keys** → Create key
3. Paste key into `.env` as `RESEND_API_KEY`
4. In production, verify your sending domain in Resend

---

## Deployment

### Backend → Railway

1. Push code to GitHub
2. New project on [railway.app](https://railway.app) → Deploy from GitHub
3. Add MySQL plugin or connect external DB
4. Add all `.env` variables in Railway's environment panel
5. Set `NODE_ENV=production`

### Frontend → Vercel

1. Push `client/` folder (or the whole repo)
2. New project on [vercel.com](https://vercel.com)
3. Set root directory to `client`
4. Add `VITE_API_URL` if using a custom API URL

---

## Security Features

- ✅ Passwords hashed with bcrypt (cost factor 12)
- ✅ JWT stored in HttpOnly + SameSite=Strict cookies
- ✅ Login rate limiting (5 attempts → 15 min lockout)
- ✅ Global API rate limiting (200 req / 15 min / IP)
- ✅ All secrets in `.env` — never committed
- ✅ Helmet.js security headers (CSP, HSTS, X-Frame-Options)
- ✅ Zod input validation on every API route
- ✅ Prisma parameterized queries (SQL injection impossible)
- ✅ CORS restricted to `CLIENT_URL`
- ✅ Google OAuth 2.0 (no passwords needed for Google users)
- ✅ Password reset via time-limited hashed tokens
- ✅ Registration modes: open / approval / disabled

---

## Project Structure

```
agripulse-v2/
├── src/                     # Express + TypeScript backend
│   ├── lib/prisma.ts        # Prisma client singleton
│   ├── middleware/
│   │   └── auth.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts   # Login, register, Google OAuth, password reset
│   │   ├── animals.routes.ts
│   │   ├── data.routes.ts   # Milk, health, breeding, financial
│   │   └── extra.routes.ts  # Dashboard, workers, AI, admin
│   ├── services/
│   │   └── mail.service.ts  # Welcome, approval, reset emails
│   └── index.ts             # Express app
├── prisma/
│   └── schema.prisma        # Full DB schema
├── client/                  # React + TypeScript frontend
│   └── src/
│       ├── context/AuthContext.tsx
│       ├── components/
│       │   ├── layout/Layout.tsx
│       │   └── ui/index.tsx
│       ├── pages/
│       │   ├── Auth.tsx      # Login + Register
│       │   ├── Dashboard.tsx
│       │   ├── Animals.tsx
│       │   ├── AIAdvisor.tsx
│       │   └── DataPages.tsx # Milk, Health, Breeding, Financial, Workers
│       ├── hooks/useToast.ts
│       ├── lib/api.ts        # Axios instance
│       └── types/index.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Comparison: Before vs After

| Feature | PHP (before) | TypeScript (after) |
|---|---|---|
| Type safety | ❌ None | ✅ Full TypeScript strict |
| DB access | PDO raw SQL | Prisma ORM (type-safe) |
| Auth | PHP sessions + cookies | JWT + HttpOnly cookies |
| Google login | ❌ Not supported | ✅ OAuth 2.0 built-in |
| Input validation | manual `trim()`/`filter_var()` | Zod schemas on every route |
| Secrets | Hardcoded in `db.php` | `.env` file (never committed) |
| Password reset | ❌ Not present | ✅ Email token flow |
| Security headers | ❌ None | ✅ Helmet.js |
| Rate limiting | PHP-based lockout only | Express rate limit + lockout |
| Frontend | PHP-mixed HTML | React components + Tailwind |
| API | ❌ No API | ✅ REST API (usable by mobile too) |
