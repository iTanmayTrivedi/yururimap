# Plan: Minna no Komatta Map — Spec-Aligned Rebuild

Based on the attached spec sheets. Executes in 5 phases; each phase ships end-to-end before the next.

---

## Phase 1 — Data model (migration)

Add category + subtopic to posts and activities; add "affected_group" and thanks counter.

**New columns**
- `posts.category` — `kurashi | community | business | education`
- `posts.subtopic` — string key (e.g. `childcare`, `medical`, `roads`, `parks`)
- `posts.affected_group` — string (`kids`, `adults`, `seniors`, `disabled`, `everyone`, `foreigners`) — already exists; will be reused
- `posts.thanks_count` — cached integer for resolved-heart "ありがとう" taps
- `activities.category` — same enum
- `activities.subtopic` — string key
- New table `post_thanks (post_id, session_id, created_at)` — unique per session, powers the 「ありがとう！」 counter on resolved heart pins

**My Page**
- Extend age groups to the 10-bucket set from the mockup (未就学, 小学生, 中学生, 高校生, 18–22, 23–40, 41–59, 60–69, 70–79, 80+, 回答しない)
- Add `country_region` (string) alongside `home_area`
- All stored client-side in `niko_profile` (already the pattern); demographics snapshot into posts/likes as today

**Grants + RLS**: keep current anon insert/select model; add matching policies for `post_thanks`.

---

## Phase 2 — Category-first UI (Home + submission flow)

**Home (`/`)**
- Header row: マイページ chip + ご意見 + お知らせ (kept, cleaned up)
- Hero: 「どんなことに困っている？」
- 4 large category tiles: 暮らし / コミュニティ / ビジネス / 教育 (colors from spec: green/orange/blue/purple)
- Problem Map preview + stats footer (今日の投稿 / 私も困った / 解決済)
- Bottom nav reordered: 困ったマップ / 活動マップ / 暮らし / コミュニティ / ビジネス / 教育 (last 4 marked 準備中 — they're deep links into filtered maps, not stubs)

**Submission flow (`/post/$category`)**
- Step 1: subtopic list (per category, from spec):
  - 暮らし: 子育て, 医療・健康, 介護・福祉, 住まい, 税金・手続き, 道路・交通, 公園・公共施設, 防災・防犯, 動物・環境, その他
  - コミュニティ: 地域イベント, ボランティア・支援活動, 地域の活動・運営, 子育て支援・親の交流, 高齢者・見守り活動, 情報発信・広報, 仲間募集・コミュニティづくり, 資金・寄付の募集, その他
  - ビジネス: 働き方・労働環境, 採用・人材, 経営・資金繰り, 職場環境・設備, 仕事の効率化・DX, 取引・営業, 法務・手続き・行政, その他 (no photo per spec)
  - 教育: 学校の設備・環境, 学習・進路, 先生・人員, いじめ・不登校, 部活動・課外活動, 子育て・家庭学習, その他 (no photo per spec)
- Step 2: form (photo where allowed → 何に困っていますか? → location → 誰が困っていますか?)
- 「投稿する」 button colored per category

**Problem Map (`/map`)**
- Category filter chips with counts
- Pins colored by category; resolved posts show heart pin in category color
- Popup: title, place, 私も困った (count), and on resolved posts the ありがとう button

**Activity Map (`/activities`)**
- Same 4 categories; activity-post form gets category + subtopic + scope (一カ所/地域/全国/世界中/オンライン) matching spec radio card layout
- Add 寄付先URL field
- Draft save + admin approval kept

---

## Phase 3 — My Page redesign

- Location ON/OFF toggle (unchanged)
- 年齢 grid with face icons (using existing `FaceIcon` component or lucide fallback) — the 10-bucket set
- 性別 row: 女性 / 男性 / その他 / 回答しない
- 普段住んでいる国・地域 (country/region text search — client-side filter over a curated JP prefectures + world regions list)
- 居住地域 with 現在地を使う button
- 利用規約・プライバシーポリシー link
- Sticky 保存 button at bottom

---

## Phase 4 — Google Places Autocomplete

- Connect Google Maps connector (calls `standard_connectors--connect`)
- Replace Nominatim/Photon in `LocationPicker.tsx` with Places API (New) via the connector gateway (server function `searchPlaces.functions.ts` using `X-Goog-FieldMask`)
- Client uses `PlaceAutocompleteElement` via the browser key for the actual autocomplete widget; server route resolves place details when a suggestion is chosen
- Applied everywhere a location is picked: /post/$category, /activities/new, /my

---

## Phase 5 — PWA auto-update

- Add `vite-plugin-pwa` with `registerType: "autoUpdate"`, `generateSW`, guarded registration wrapper (skip in preview/iframe/dev, support `?sw=off` kill-switch)
- HTML: `NetworkFirst`; hashed assets: `CacheFirst`
- Existing `public/sw.js` becomes the kill-switch worker for one release then is replaced by generated SW
- Users get latest version on next visit without reinstalling

---

## Out of scope (per your answer)

- Old beta URL (yururmap.lovable.app) left alone
- Statistics/CSV export already shipped; will just extend the CSV with new category/subtopic columns
- Life/Company/School standalone routes: replaced by the 4 category deep-links on the map

---

## Technical notes

- Migration is one file; grants + policies included per public-schema rule
- Category enum lives in `src/lib/categories.ts` (new); subtopic maps colocated
- Existing `posts.type` (happy/request/promote) kept in DB but hidden in UI; all new posts default `type = 'request'`
- Google Maps connector: server-side calls via gateway for details/geocode; browser key for the autocomplete element
- PWA registration wrapper in `src/lib/pwa.ts`; gated per skill rules

---

Approve to proceed with Phase 1 (migration).