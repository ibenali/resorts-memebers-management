# Sterling Resorts Members Management

This project provides a simple web application for Sterling Resorts members built with **Node.js**, **Next.js** and **PostgreSQL**.

## Features
- Member login using member ID and password.
- View resort details including seasons and other information.
- Submit feedback.
- Update address and change password.
- Request vacations.

## Development
1. Install dependencies (requires internet access):
   ```bash
   npm install
   ```
2. Set the `DATABASE_URL` environment variable to point to your PostgreSQL instance.
3. Start the development server:
   ```bash
   npm run dev
   ```
   This runs the Express API and Next.js frontend on `http://localhost:3000`.

The repository includes a `schema.sql` file with the PostgreSQL schema.  You can
create the required tables using:

```bash
psql -f schema.sql
```

This will create the `members`, `resorts`, `feedback` and
`vacation_requests` tables used by the application.
