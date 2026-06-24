# DIM Base44 → Supabase Migration Plan

## Generated artifacts

- `migration/001_supabase_schema.sql` — Supabase/Postgres schema generated from `base44/entities/*.jsonc`.
- `migration/base44-api-call-map.csv` — every `base44.*` call found in `src`.
- `src/api/supabaseClient.js` — Supabase browser client.
- `src/api/dimDataClient.js` — compatibility-style data/auth/storage wrapper to replace most Base44 entity calls.

## Main Base44 dependencies found

### Package/config dependencies

Remove these after replacing imports:

```bash
npm remove @base44/sdk @base44/vite-plugin
npm install @supabase/supabase-js
```

Update `vite.config.js` to remove the Base44 plugin and leave only React:

```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
});
```

Add `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Database migration

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `migration/001_supabase_schema.sql`.
4. In Storage, create a public bucket named `item-images`.
5. Create your first user through Supabase Auth.
6. Promote your profile to admin:

```sql
update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
```

## Code migration path

### Phase 1 — install Supabase and remove Base44 plugin

- Install `@supabase/supabase-js`.
- Remove `@base44/sdk` and `@base44/vite-plugin`.
- Replace `vite.config.js` as shown above.

### Phase 2 — compatibility import swap

Most app code imports this:

```js
import { base44 } from '@/api/base44Client';
```

For a low-risk first pass, replace with:

```js
import { dim as base44 } from '@/api/dimDataClient';
```

This keeps most existing call sites working while moving the backend from Base44 to Supabase.

### Phase 3 — auth refactor

`src/lib/AuthContext.jsx` currently uses Base44 public settings and Base44 redirect login. Replace it with Supabase session handling.

Minimum behavior needed by the app:

- `user`
- `isAuthenticated`
- `isLoadingAuth`
- `logout()`
- `navigateToLogin()`
- `checkAppState()`

`dimDataClient.js` already provides `auth.me`, `auth.logout`, and `auth.updateMe`, but you still need a `/login` page or a simple email/password/magic-link component.

### Phase 4 — storage upload

`ItemForm.jsx` calls:

```js
base44.integrations.Core.UploadFile({ file })
```

The compatibility wrapper maps this to Supabase Storage bucket `item-images`.

### Phase 5 — user invites

`Settings.jsx` calls:

```js
base44.users.inviteUser(inviteEmail.trim(), inviteRole)
```

Supabase invitations require the service role key, so this must be implemented as a server-side Edge Function, not in the browser.

### Phase 6 — low-stock daily alert

`base44/functions/checkLowStock/entry.ts` should become a Supabase Edge Function or scheduled job. It needs:

- Service-role Supabase client
- Query `inventory_items`
- Query admin `profiles`
- Email provider integration: Resend, SendGrid, Postmark, or SMTP relay

## Entity/table mapping

| Base44 Entity | Supabase Table |
|---|---|
| User | profiles |
| Category | categories |
| Supplier | suppliers |
| Location | locations |
| InventoryItem | inventory_items |
| Recipe | recipes |
| ItemHistory | item_history |

## Known manual fixes after import swap

1. `base44.users.inviteUser` needs Edge Function implementation.
2. `AuthContext.jsx` should remove `@base44/sdk/dist/utils/axios-client` and app public-settings checks.
3. `App.jsx` and `PageNotFound.jsx` may need minor redirect/login logic changes.
4. Data exported from Base44 may use `created_date`; Supabase uses `created_at`. The wrapper maps sort keys, but imported historical data should be normalized.
5. If Base44 IDs are not UUIDs, either preserve them as `text` IDs or map old IDs to new UUIDs during import. The current schema assumes UUID IDs.

## Immediate next edit sequence

1. Run schema in Supabase.
2. Create `.env.local`.
3. Install Supabase package.
4. Swap imports from `base44Client` to `dimDataClient`.
5. Replace `AuthContext.jsx` with Supabase session handling.
6. Test Inventory, Categories, Suppliers, Locations CRUD.
7. Implement invites and daily alert as Edge Functions.
