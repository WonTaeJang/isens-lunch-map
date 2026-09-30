This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Excel restaurant import

The `/admin` page imports a complete `.xlsx` list (up to 3 MB / 1,000 restaurants).
Set `DATABASE_URL`, `KAKAO_REST_API_KEY`, and `ADMIN_PASSWORD` in `.env` and in
Vercel's server environment variables. Never prefix these with `NEXT_PUBLIC_`.
The existing `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` is used only for browser maps.

1. Enter the administrator password and select the complete workbook.
2. Run validation/preview. Exactly one table with `가맹점명` and `주소` headers
   must exist in the first 30 rows of a visible worksheet. Hidden and very-hidden
   worksheets are excluded. Optional columns are
   `카테고리`, `대표메뉴`, and `거리` (bare numbers mean meters).
3. Review added/updated/struck/missing counts, then apply the complete list.

Matching uses name + address, ignoring whitespace and Unicode width differences.
Changing a name or address creates a new entry and deactivates the unmatched old
entry. Missing rows are never deleted. Any explicit cell or rich-text strike in
an imported data field makes that row inactive (conditional-formatting strikes
are not supported). Unstruck imported rows become active; this supersedes manual
status changes on the next import. Hidden/filtered rows within the selected visible worksheet are also imported.

All coordinates are resolved before writes. Valid existing coordinates are reused.
Failed/ambiguous address lookups save NULL address, latitude and longitude.
The address-error list shows rows whose address is NULL and lets administrators
enter an address to search and save coordinates. No additional columns are needed.
On reimport, a NULL-address row matches by name only when unambiguous; otherwise
resolve the address first. After manual correction, normal name + address matching applies.
An invalid row, stale preview, duplicate, or DB failure aborts the import without partial changes. Commit holds a table lock and
uses a transaction; updates to the table after preview require a new preview.
The main page reads only active restaurants; rows without valid coordinates are
listed but do not receive map markers.

`npm test` checks parsing and synchronization with a mock database.
`npm run db:check` checks the real DB read-only.
`node scripts/check-import.mjs` checks authenticated preview and Kakao geocoding
without inserting fixtures (requires a running local dev server).

The CA certificate in `lib/certs` is the public Supabase certificate downloaded
from its dashboard. It is included in Next.js server deployment traces.
