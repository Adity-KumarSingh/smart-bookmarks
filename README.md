# Smart Bookmarks

A bookmark manager built with Next.js, Supabase, and Tailwind CSS. Save, organize, and manage bookmarks with real-time sync across tabs — all behind Google authentication.

**Live URL:** https://smart-bookmarks-tawny.vercel.app

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Backend / Auth / Realtime:** Supabase (PostgreSQL, Auth, Realtime)
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel

---

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd smart-bookmarks
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Enable Google OAuth:
   - Go to **Authentication > Providers > Google**
   - Add your Google OAuth Client ID and Secret (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
   - Set the redirect URL shown in Supabase as the Authorized redirect URI in Google Cloud
4. Enable Realtime:
   - Go to **Database > Replication** and ensure `bookmarks` table is added to the `supabase_realtime` publication (the SQL script handles this, but verify)

### 3. Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase Auth & RLS

### Authentication

Google OAuth is configured through Supabase Auth. The flow:

1. User clicks "Continue with Google" on the landing page
2. Supabase redirects to Google's OAuth consent screen
3. Google redirects back to `/auth/callback` with an authorization code
4. The callback route exchanges the code for a session using `supabase.auth.exchangeCodeForSession()`
5. Next.js middleware on every request refreshes the session and handles redirects (unauthenticated users to `/`, authenticated users from `/` to `/dashboard`)

### Row Level Security (RLS)

RLS is enabled on the `bookmarks` table with four policies:

| Policy | Operation | Rule |
|---|---|---|
| `Users can view own bookmarks` | SELECT | `auth.uid() = user_id` |
| `Users can insert own bookmarks` | INSERT | `auth.uid() = user_id` |
| `Users can update own bookmarks` | UPDATE | `auth.uid() = user_id` (both USING and WITH CHECK) |
| `Users can delete own bookmarks` | DELETE | `auth.uid() = user_id` |

**Why these are correct:**

- `auth.uid()` returns the ID of the currently authenticated user from the JWT token — this is validated server-side by Supabase, so it cannot be spoofed from the frontend.
- Every policy compares `auth.uid()` against the `user_id` column, ensuring User A can never read, modify, or delete User B's bookmarks.
- The INSERT policy uses `WITH CHECK` to ensure users can only create bookmarks where `user_id` matches their own ID — preventing a user from inserting bookmarks "as" another user.
- The `user_id` column has a foreign key constraint to `auth.users(id)` with `ON DELETE CASCADE`, so when a user is deleted, all their bookmarks are automatically removed.

---

## Real-Time Sync

Real-time sync is implemented using **Supabase Realtime Postgres Changes**. Here's how it works:

### Implementation

In `BookmarkList.tsx`, a Supabase Realtime channel subscribes to all changes on the `bookmarks` table filtered by the current user's ID:

```typescript
const channel = supabase
  .channel("bookmarks-realtime")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "bookmarks",
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Add new bookmark to state (with duplicate check)
  })
  .on("postgres_changes", {
    event: "DELETE",
    ...
  }, (payload) => {
    // Remove bookmark from state
  })
  .on("postgres_changes", {
    event: "UPDATE",
    ...
  }, (payload) => {
    // Update bookmark in state
  })
  .subscribe();
```

### How it works

1. **Channel creation:** A single channel named `bookmarks-realtime` listens for INSERT, DELETE, and UPDATE events on the `bookmarks` table.
2. **Server-side filtering:** The `filter: user_id=eq.${userId}` parameter ensures Supabase only sends events for the current user's bookmarks — not all bookmarks in the table.
3. **State updates:** Each event type updates the React state accordingly — INSERT prepends, DELETE filters out, UPDATE maps over the array.
4. **Duplicate prevention:** The INSERT handler checks if the bookmark already exists in state (because the same tab that created it will already have it via optimistic update/re-render).
5. **Cleanup:** The `useEffect` return function calls `supabase.removeChannel(channel)` to properly unsubscribe when the component unmounts, preventing memory leaks and orphaned connections.

### Cross-tab sync

Open the app in two tabs. Add a bookmark in Tab A — it appears in Tab B instantly without any page refresh, because both tabs have active Realtime subscriptions.

---

## Bonus Feature: Auto URL Metadata Fetching

### What it does

When a user pastes or types a URL in the "Add Bookmark" form, the app automatically fetches:
- **Page title** (from `<title>` or Open Graph `og:title` meta tag)
- **Page description** (from `<meta name="description">` or `og:description`)
- **Favicon** (via Google's favicon service for reliability)

The title and description fields auto-populate, and a small preview card appears showing the favicon and title.

### Why I chose this

1. **Reduces friction:** The biggest pain point in bookmark managers is manually typing titles. Auto-fetching eliminates this for 90%+ of URLs.
2. **Visual richness:** Favicons make the bookmark list scannable at a glance — you can spot GitHub, YouTube, or Stack Overflow bookmarks instantly without reading.
3. **Demonstrates full-stack thinking:** This feature requires a server-side API route (to avoid CORS issues), input debouncing, loading states, and graceful error handling — all important production patterns.

### Implementation

- **API Route:** `src/app/api/metadata/route.ts` — a protected POST endpoint that fetches the URL, parses HTML for meta tags, and returns structured metadata.
- **Debounced fetch:** The form debounces URL input by 600ms before triggering the metadata fetch, avoiding unnecessary requests while typing.
- **Graceful degradation:** If metadata fetch fails (CORS, timeout, invalid page), the user can still manually enter a title. The favicon falls back to Google's favicon service.

---

## Problems I Ran Into & Solutions

1. **Supabase Realtime filter syntax:** Initially tried complex filter syntax. Solved by using the simple `filter: \`user_id=eq.${userId}\`` format which Supabase Realtime supports for Postgres Changes.

2. **Duplicate bookmarks on INSERT:** When adding a bookmark from the same tab, both the local state update and the Realtime event would fire. Solved by adding a duplicate check in the INSERT handler: `if (prev.some((b) => b.id === payload.new.id)) return prev`.

3. **CORS on metadata fetching:** Fetching arbitrary URLs from the browser is blocked by CORS. Solved by creating a server-side API route (`/api/metadata`) that fetches the URL and returns parsed metadata.

4. **useSearchParams SSR hydration:** `useSearchParams()` requires a Suspense boundary in Next.js App Router to avoid hydration mismatches. Wrapped the landing page component in `<Suspense>`.

---

## One Thing I'd Improve With More Time

**Bookmark organization with tags/folders and drag-and-drop reordering.** Currently bookmarks are displayed in a flat list sorted by creation date. With more time, I'd add:

- A tagging system where users can create custom tags (e.g., "work", "recipes", "reading list") and assign multiple tags per bookmark
- Filterable sidebar/chips for quick tag-based filtering
- Drag-and-drop reordering using a library like `@dnd-kit/core`
- Bulk operations (select multiple bookmarks, delete or tag them at once)

This would transform it from a simple save-and-retrieve tool into a proper organizational system.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with fonts
│   ├── page.tsx            # Landing page with Google login
│   ├── globals.css         # Tailwind v4 theme + animations
│   ├── auth/callback/
│   │   └── route.ts        # OAuth callback handler
│   ├── dashboard/
│   │   └── page.tsx        # Main dashboard (server component)
│   └── api/metadata/
│       └── route.ts        # URL metadata fetcher (bonus feature)
├── components/
│   ├── Header.tsx           # Navigation header with user info
│   ├── AddBookmarkForm.tsx  # Form with URL auto-metadata
│   ├── BookmarkCard.tsx     # Individual bookmark with delete confirm
│   └── BookmarkList.tsx     # Real-time bookmark list with search
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   ├── server.ts        # Server Supabase client
│   │   └── middleware.ts     # Session refresh middleware
│   └── types.ts             # TypeScript interfaces
├── middleware.ts             # Next.js middleware (auth guard)
└── supabase/
    └── schema.sql           # Database schema + RLS policies
```
