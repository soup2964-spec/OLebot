# Supabase setup for live behavior analytics

1. **Run the migration** in your Supabase project SQL Editor:
   - Open `supabase/migrations/20260702120000_landing_lab_analytics.sql`
   - Paste and execute in [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard)

2. **Add env vars** to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Project Settings → API → service_role (secret)
   ```

3. **Start the app**: `npm run dev`

4. **Generate live data**: visit variant pages, e.g. `http://localhost:3000/v/v1-roi`
   - Scroll the page
   - Click a CTA button
   - Leave the tab (records dwell + bounce)

5. **View the report**: Experiment workbench → **User behavior**
   - Shows **Live data · Supabase** banner when connected
   - Refreshes every 30 seconds

## Tables

| Table | Purpose |
|-------|---------|
| `lab_sessions` | One row per browser session (variant, conversion, scroll, dwell) |
| `lab_events` | Granular events (page_view, section_view, cta_click, scroll_depth, page_exit) |

All writes go through `/api/analytics/session` using the service role key (never exposed to the browser).
