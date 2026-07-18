# Minna no Komatta Map — Refocus & New Features

Pivot the app to focus on collecting local issues. The five-emotion features (Trip Log, Events, Connections) will be split into a separate future app; here we hide them behind "Under Maintenance" but keep tab slots as requested.

## Scope of this iteration

Priority 1 — Home & posts, Priority 2 — Community Activities, plus the three cross-cutting improvements: demographics capture, Me-too dedupe, and post reporting.

## 1. Home page (highest priority)

Redesigned home based on mockup ①:
- Header: title "みんなの声Map / Minna no Koe Map" (keep current bilingual pattern), My Page + Feedback + Announcements chips.
- 3 stat tiles: total posts / my "me-too" count / resolved count.
- Big primary CTA: **困ったを投稿する** → `/post/request`.
- Secondary row of 3 chips: 🩷 よかった投稿, 🟧 リクエスト (same as 困った), 🟩 活動を広める.
- Embedded map preview showing all 3 post types with counts on pins → tap opens `/map`.
- Bottom nav (6 slots, as requested): マップ / 暮らし / 会社 / 学校 / 取り組み / マイページ.
  - 暮らし, 会社, 学校 = "Under Maintenance" stubs.
  - 取り組み = Community Activities (new).
  - マップ = the unified problem/happy/promote map.

## 2. Post types (unchanged shapes, minor tweaks)

Keep the existing three post types (`happy` / `request` / `promote`). No structural change to the post form beyond bug-fix polish.

## 3. Resolution reports (NEW)

New table `resolution_reports` linked to a `posts.id` (only `type='request'` posts can be resolved).

Fields: `related_post_id`, `description` (required), `photo_url` (required, 1 photo), `session_id`, `status` (pending|approved|rejected), `created_at`, `reviewed_at`, `reviewed_by`.

Flow:
1. On a Request post's detail popup on the map, add "解決を報告する" button → `/resolve/$postId`.
2. Form: shows the related post, textarea for resolution description (required), 1 photo (required), submit → status=pending.
3. Admin page `/admin` gets a new "解決報告" tab listing pending resolutions with approve/reject.
4. When approved, the parent post gets `resolved=true` (add column). Map renders resolved posts as pink hearts instead of the type color.

Tap a resolved pin → shows original problem + resolution photo/description + "ありがとう" counter (like button reused).

## 4. Community Activities (取り組み)

New feature at `/activities`. Only "verified" submitters can post; verification is a flag `is_verified_poster` on a new `verified_posters` table keyed by `session_id`, seeded/managed by admin.

New table `activities`:
- `id`, `session_id`, `status` (draft|pending|approved|rejected)
- `activity_type` enum: `meetup` | `join` | `create` | `space` | `protect` | `support`
- `title` (required), `description` (required)
- `scope` enum: `single` | `local` | `regional` | `national` | `global`
- `place_label`, `lat`, `lng` (required only when scope in single/local)
- `official_url`, `photo_url` (1 photo, required)
- `created_at`, `updated_at`, `reviewed_at`

Screens:
- `/activities` — three horizontal carousels: 地方の取り組み / 全国の取り組み / 世界の取り組み (mockup ③ right). Filter chips by activity type. Map pin cluster at top.
- `/activities/new` — form with all fields, "下書き保存" and "申請する" buttons. Blocked with a friendly message if the session isn't verified.
- `/activities/$id` — detail with like button.
- `/admin` gets a new "取り組み承認" tab (approve / reject).

Likes reuse the same dedupe pattern as Me-too (see §6).

## 5. Demographics capture (analytics)

Extend existing `profile.ts` (age group, gender, home area) — already stored locally. When a user submits a post OR presses "Me too" / "Like", copy the current profile snapshot to the DB row:
- Add `age_group`, `gender`, `home_area` columns to `posts`, `post_likes`, `activities`.
- Also add these to a new `activity_likes` table.
- All demographic fields are nullable; no auth required.

Admin export: new admin action "CSVエクスポート" that pulls posts + likes with demographics as CSV via a server function returning a Response.

## 6. Prevent duplicate Me-too / likes

Add `UNIQUE (post_id, session_id)` on `post_likes` (if missing). Same for `activity_likes`. Client hides/toggles the button when the session has already voted; server rejects duplicates via the unique constraint.

## 7. Report inappropriate posts

New table `post_reports`:
- `id`, `post_id` (nullable), `activity_id` (nullable), `resolution_id` (nullable), `session_id`, `reason` (short text), `created_at`, `status` (open|dismissed|actioned).

UI: small "⚠ 報告" link inside every post popup / activity detail. Opens a small dialog with reason textarea. Admin gets a "通報" tab listing all reports with a "この投稿を削除" action that soft-deletes the target (add `hidden=true` column on posts/activities/resolutions; hidden rows are filtered from all public queries).

## Technical details

- All new tables in `public` with `GRANT`s + RLS.
  - Inserts allowed to `anon` + `authenticated` (matches existing session-header pattern).
  - Update/delete for non-admin only when `session_id = current_session_id()` (own drafts, own reports).
  - Admin (existing `is_admin()`) can update/delete everything.
- Photo uploads reuse existing `activity-photos` bucket with signed URLs.
- Realtime not required — normal fetch-on-navigate is fine.
- `/events`, `/share`, `/trip`, `/live/$code` stay as "Under Maintenance" or hidden from nav (already partially the case).

## File plan

New:
- `src/routes/resolve.$postId.tsx`
- `src/routes/activities.tsx`
- `src/routes/activities.new.tsx`
- `src/routes/activities.$id.tsx`
- `src/routes/report.tsx` (or inline dialog component)
- `src/components/ReportDialog.tsx`
- `src/lib/activities.ts` (types + type meta)
- `src/lib/resolutions.ts`

Modified:
- `src/routes/index.tsx` — new home layout per mockup ①.
- `src/routes/map.tsx` — pink-heart rendering for resolved, popup with "解決を報告", "報告".
- `src/routes/admin.tsx` — 3 new tabs: 解決報告 / 取り組み / 通報 + CSV export button.
- `src/components/AppLayout.tsx` — bottom nav reorder to マップ / 暮らし / 会社 / 学校 / 取り組み / マイページ.
- `src/lib/posts.ts` — Me-too dedupe helper reading `post_likes` for current session.
- `src/routes/post.$type.tsx` — stamp demographics from `loadProfile()` on submit.
- Existing "暮らし/会社/学校" routes → stub "準備中".

## Migrations (one migration each, in order)

1. Add `resolved`, `hidden` columns to `posts`; create `resolution_reports` with GRANTs, RLS, admin+own policies.
2. Create `activities` + `activity_likes` + `verified_posters` with GRANTs, RLS, dedupe UNIQUE.
3. Add demographics columns to `posts`, `post_likes`; add `hidden` to `activities`.
4. Create `post_reports` with GRANTs, RLS.
5. Add `UNIQUE (post_id, session_id)` on `post_likes` if not present.

## Out of scope for this turn

- Rendering the exact illustrated cards from mockups (we'll use icon + color chips, close in spirit but not custom illustrations).
- Push notifications when a resolution is approved.
- Verified poster self-signup (admin manually inserts session IDs for now).
- Full separate "Kimochi Map" app split.
