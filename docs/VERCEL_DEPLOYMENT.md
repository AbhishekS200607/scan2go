# Vercel Deployment Guide for Scan2Go

This guide walks you through deploying the **Scan2Go — Smart Supermarket Self-Checkout Platform** to **Vercel** with Supabase PostgreSQL integration.

---

## 🏗️ Deployment Architecture on Vercel

- **Backend REST API**: Runs on Vercel Serverless Node.js functions via `api/index.js` handling all `/api/*` endpoints.
- **Frontend SPA / Static Assets**: Served instantly with global edge CDN caching directly from `client/`.
- **Database**: Connects to your remote Supabase PostgreSQL database using standard `@supabase/supabase-js` or falls back gracefully to pre-seeded demo data if credentials are not provided.

---

## 🚀 Step 1: Deploy via Vercel CLI

1. Install Vercel CLI globally:
   ```bash
   npm i -g vercel
   ```

2. Login to your Vercel account:
   ```bash
   vercel login
   ```

3. Deploy from project root:
   ```bash
   vercel
   ```
   *(For production deployment, run `vercel --prod`)*

---

## 🌐 Step 2: Deploy via GitHub / Vercel Web Dashboard

1. Push your Scan2Go repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **Add New** $\rightarrow$ **Project**.
3. Import your `scan2go` repository.
4. Framework Preset: **Other**.
5. Root Directory: `./` (Leave as root).
6. Click **Deploy**.

---

## 🔐 Step 3: Configure Environment Variables on Vercel

In Vercel Dashboard $\rightarrow$ **Project Settings** $\rightarrow$ **Environment Variables**, add the following keys:

> [!NOTE]
> **Do NOT add `PORT` to Vercel Environment Variables**. Vercel manages `PORT` automatically for serverless functions.

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production environment flag |
| `JWT_SECRET` | `your_super_secret_jwt_key_here_32_chars` | Secret key for signing session tokens |
| `SUPABASE_URL` | `https://your-supabase-project.supabase.co` | Remote Supabase project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Public Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Supabase Service Role Key (Required for stored RPCs) |

---

## 🗄️ Step 4: Supabase Database Migration (One-Time Setup)

1. Open your Supabase Dashboard SQL Editor.
2. Paste and run the contents of [`supabase/migrations/001_initial_schema.sql`](file:///d:/abhishek/LOCAL%20GO/supabase/migrations/001_initial_schema.sql) to create tables, indexes, constraints, and atomic stored procedures.
3. Paste and run [`supabase/seed.sql`](file:///d:/abhishek/LOCAL%20GO/supabase/seed.sql) to seed categories, products, and default accounts.

---

## 🧪 Step 5: Verify Live Deployment

After deployment completes, open your live Vercel URL (e.g., `https://scan2go.vercel.app`):
- Customer Portal: `https://scan2go.vercel.app/customer/dashboard.html`
- Camera Scanner: `https://scan2go.vercel.app/customer/scanner.html`
- Security Gate Portal: `https://scan2go.vercel.app/security/dashboard.html`
- Admin Dashboard: `https://scan2go.vercel.app/admin/dashboard.html`
- API Health Check: `https://scan2go.vercel.app/api/products`
