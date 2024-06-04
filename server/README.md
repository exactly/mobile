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

After changing the schema declaration in `db/schema.th` you can run

```bash
bun db:migrate
```

to apply schema changes directy to DB.

### Advanced

If needed, migration can be done in 2 steps, first generating the migration SQL query and then executing it.
After changing the schema declaration in `db/schema.th` run:

``` bash
bun db:migration:generate
```

 The SQL migration file will be generated under `/drizzle` with a number and unique name.
To execute it, run:

``` bash
bun db:migration:push
```
