# niconicoshimbori

Build a fully functional bilingual PWA web app called ニコニコしょんぼりマップ (NikoNiko Shonbori Map).

IMPORTANT: This must be fully functional with real Supabase integration, not just a UI mockup. Every button must work, every screen must read and write real data.

SUPABASE SETUP
Create this table called submissions:

sql

create table submissions (
  id uuid default gen_random_uuid() primary key,
  mood text not null,
  mood_en text not null,
  mood_color text not null,
  timestamp timestamptz default now(),
  exact_lat float,
  exact_lng float,
  rounded_lat float,
  rounded_lng float,
  shared_code text,
  session_id text not null
);

On app load, generate a random session_id using crypto.randomUUID() and store it in localStorage. Use this as the user identifier — no login required.

SCREEN 1 — 気持ち入力 (Mood Input)

Show the title: 今の気持ちは？/ How are you feeling?

5 large tappable cards with emoji, Japanese name, English name, and color:

😁 ニコニコ / Very Good → #4CAF50 (green)

🙂 まあまあ / Good → #8BC34A (light green)

😐 ふつう / Neutral → #FFC107 (yellow)

😟 いまいち / Not Great → #FF9800 (orange)

😢 しょんぼり / Feeling Down → #F44336 (red)

Below the buttons, optional text input: 共有コード / Shared Code (placeholder: "グループコードを入力 / Enter group code")

When user taps a mood button:

Request GPS via navigator.geolocation.getCurrentPosition()

Store exact lat/lng

Calculate rounded lat/lng by rounding to nearest 0.005 degrees

Insert row into Supabase submissions table

Show a success toast: 記録しました！/ Recorded!

If GPS is denied, still save submission with null location

SCREEN 2 — みんなのマップ (Public Map)

Load Google Maps centered on Tokyo (35.6762, 139.6503), zoom level 11.

Fetch ALL submissions from Supabase where exact_lat IS NOT NULL.

Plot each submission as a colored circle marker using ROUNDED coordinates only (never exact on public map).

Show at top:

総投稿数 / Total Submissions: [count]

今日の投稿数 / Today's Submissions: [count]

Below map show mood summary counts:
😁 ニコニコ: [n] / 🙂 まあまあ: [n] / 😐 ふつう: [n] / 😟 いまいち: [n] / 😢 しょんぼり: [n]

SCREEN 3 — じぶんの記録 (My History)

Fetch submissions from Supabase where session_id = [current session_id], ordered by timestamp descending.

Show:

Personal submission count

List of past submissions: emoji + mood name + date/time

Small Google Map showing personal submissions with EXACT coordinates as markers

If no submissions yet, show: まだ記録がありません / No records yet

SCREEN 4 — 共有コード統計 (Shared Code Stats)

Input field to enter a shared code with a 検索 / Search button.

On search, fetch all submissions where shared_code = [entered code].

Display:

参加人数 / Participants: count of unique session_ids

Mood distribution: each mood with count + percentage + colored progress bar

Time trend chart (using Recharts line chart) showing submission count per hour of day

If no results found: このコードの記録はありません / No records for this code

NAVIGATION
Bottom tab bar with 4 tabs:

気持ち入力 / Input

マップ / Map

じぶん / My Records

共有コード / Shared Code

DESIGN REQUIREMENTS

Mobile-first (max-width 430px centered)

Soft warm white background (#FAFAFA)

Japanese + English labels on everything

Large touch targets (min 56px height buttons)

Clean card-based layout

Loading spinners while fetching data

Error states if Supabase fetch fails

Government/Google Analytics dashboard style for stats screens

PWA REQUIREMENTS

Add manifest.json with app name, icons, theme color

Add service worker for basic offline support

App must be installable from browser home screen

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://yururmap.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7f117cc1-dbce-41d8-9faa-af66e8394875).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
