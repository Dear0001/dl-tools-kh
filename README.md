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

Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.

## Database, sign-in, and saved data

Tool transformations remain in the browser. Google sign-in is optional and enables account-synced preferences, recent tools, and explicitly saved text/data. Saved data is associated with the signed-in account and is not collected automatically from tool inputs or outputs.

### Configure PostgreSQL and Google OAuth

1. Create a PostgreSQL database and add `DATABASE_URL` to the root `.env` file. Keep `.env` and `.env.local` private; neither should be committed.
2. Create a Google OAuth client. Add `http://localhost:4028` as an authorized JavaScript origin and `http://localhost:4028/api/auth/callback/google` as an authorized redirect URI. Add the production site and its `/api/auth/callback/google` callback before deploying.
3. Add `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and a random `AUTH_SECRET` to `.env.local` for Next.js. Generate a secret with `openssl rand -base64 32`. Keep these secrets server-side; do not prefix them with `NEXT_PUBLIC_`. `.env.example` lists the required variable names.
4. Generate the Prisma client and apply the first migration:

   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   ```

5. Run `npm run dev`, open the site at port 4028, and use **Sign in**. Prisma Studio is available with `npm run db:studio`.

For production, configure the same environment variables in the hosting provider, apply committed migrations with `npm run db:deploy`, then deploy the app. Back up the PostgreSQL database and use TLS-enabled connection strings in production.

The account UI lets signed-in users save and delete up to 1 MB of text/data per item for the current tool. API access is scoped to the signed-in account, but saved content and OAuth adapter records are stored as ordinary database text; do not save passwords, access tokens, or other secrets. Protect database access and backups accordingly.

## Google Analytics

After a visitor allows analytics in the privacy prompt, the app sends GA4 page views and a `tool_open` event (tool ID, name, and category) when a visitor opens a tool. Visitors can reject or later change their choice from **Privacy settings**. Analytics runs only in production and only when a valid Measurement ID is set; local development is not tracked.

1. Create a GA4 property and Web data stream, then copy its Measurement ID (for example, `G-ABC1234567`).
2. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in your production host's environment variables. For local production builds, add it to `.env.local`.
3. Redeploy. In GA4, use **Reports → Realtime** to confirm traffic and view the `tool_open` event for tool usage. The Users/Active users reports show how many visitors used the site. To break tool events down by name or category, register `tool_name` and `tool_category` as event-scoped custom dimensions in GA4.

Disclose Google Analytics in the site's privacy notice and apply any consent requirements that apply to your visitors.

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
