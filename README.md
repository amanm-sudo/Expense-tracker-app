# Wealth Journal — Personal Finance Tracker

A premium expense tracker with AI-powered financial insights, multi-user authentication, and beautiful analytics.

Built with **Next.js 16**, **Prisma + SQLite**, **NextAuth.js**, and **TailwindCSS**.

---

## 🗄️ Accessing the Database

Your database is a local SQLite file at:
```
d:\Downloads\Expense_app_glm\db\custom.db
```

### Option 1 — Prisma Studio (Recommended, browser-based)
```powershell
npx prisma studio
```
Opens at **http://localhost:5555** — browse all tables (User, Month, Expense, Emi) with a clean UI.

### Option 2 — DB Browser for SQLite (Desktop GUI)
Download free from: https://sqlitebrowser.org/
Then open the file `db\custom.db`.

---

## 🚀 Local Development

```powershell
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Generate Prisma client + sync DB
npm run db:generate
npm run db:push

# 4. Start dev server
npm run dev
```
App runs at **http://localhost:3000**

Register a new account at **/register** — each user gets their own isolated data.

---

## 📤 Pushing to GitHub

```powershell
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit — Wealth Journal with auth"

# Push to your repo
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

> .env is in .gitignore — your secrets are never committed. Only .env.example is pushed.

---

## Required Environment Variables

| Variable | Description |
|---|---|
| DATABASE_URL | SQLite: `file:../db/custom.db` or cloud DB URL for production |
| NEXTAUTH_SECRET | Random secret string |
| NEXTAUTH_URL | Your app URL e.g. `https://yourapp.vercel.app` |
| ZAI_API_KEY | AI insights key (optional) |
