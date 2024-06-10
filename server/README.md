# Setup

Project uses Vercel serverless functions to provide endpoints for server integration.
All exposed endpoints are found under `/api`.

## Local Development

Install dependencies on parent directory (`mobile`)

```bash
bun i
```

Spin up dev server

```bash
bun server 
```

## Database

Project uses Vercel Postgres DB and drizzle as an ORM.
DB auth is handled by `@vercel/postgres` when running `vercel dev`

### Migrations

After changing the schema declaration in `database/schema.ts` you can run

```bash
bun db:migrate
```

to apply schema changes directly to DB.
