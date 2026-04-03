# 🏏 Fantasy IPL League Manager

![Fantasy IPL Banner](https://img.shields.io/badge/Next.js-14-black?logo=next.js) ![Prisma](https://img.shields.io/badge/Prisma-ORM-blue?logo=prisma) ![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

A full-stack, real-time Fantasy Cricket Application designed exclusively for family and friends. Host a live IPL auction, build your 11-man squads, and watch your total points dynamically update via a proprietary Dream11 points calculation engine!

## ✨ Key Features
- **Live Auction Room**: A fully functional admin-controlled auction interface to sell players and cleanly manage franchise budgets (₹100 Cr starting).
- **Dream11 Points Engine**: A strict T20 ruleset engine that parses live runs, wickets, strike-rates, and API bonus thresholds into accurate Fantasy Points.
- **Top Performers Tracker**: An elegant UI tracking the League Leaders across your franchises *(Orange Cap, Purple Cap, Firepower, and Control stats)*. 
- **True 11-Man Aggregate Scoring**: Unlike traditional summed scoring, the system algorithmically identifies and aggregates only the **Top 11** highest-performing players per team across the season.
- **Live API Match Sync**: Built-in endpoints to securely hook into automated cricket APIs (like CricAPI/SportMonks) to automatically sync and distribute match payload statistics instantly.
- **Next-Auth Franchise Login**: Create and secure your custom franchise safely using encrypted credentials.

## 🚀 Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS v4, Lucide Icons
- **Backend & Database**: Next.js API Routes, SQLite, Prisma ORM
- **Authentication**: Next-Auth (Credentials Provider, bcrypt hashing)
- **Styling**: Modern Glassmorphism & High-Contrast Dark Mode

## 🛠️ Quick Setup
1. Clone this repository to your local machine:
```bash
git clone https://github.com/YourUsername/fantasy-ipl.git
cd fantasy-ipl
```
2. Install the necessary dependencies:
```bash
npm install
```
3. Set your secret environment variables in a `.env` file:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="anything_you_like"
NEXTAUTH_URL="http://localhost:3000"
CRICKET_API_KEY="your_cricketdata_or_cricapi_key" # Preferred for live sync and scorecards
RAPIDAPI_CRICBUZZ_KEY="your_rapidapi_key"
RAPIDAPI_CRICBUZZ_HOST="cricbuzz-cricket.p.rapidapi.com"
```
4. Push the schema to the database:
```bash
npx prisma db push
```
5. Launch the development server!
```bash
npm run dev
```

## Live Sync Notes

The app prefers Cricket Data / CricAPI when `CRICKET_API_KEY` is configured, and falls back to Cricbuzz via RapidAPI when needed.

1. Configure `CRICKET_API_KEY` with your Cricket Data / CricAPI key for primary scorecard and match detection.
2. Configure `RAPIDAPI_CRICBUZZ_KEY` as the fallback provider.
3. Keep `RAPIDAPI_CRICBUZZ_HOST="cricbuzz-cricket.p.rapidapi.com"`.
4. Auto-sync waits until 10 overs are completed before syncing a detected live match.
5. If live over data is unavailable, the manual fallback delay defaults to 60 minutes.
