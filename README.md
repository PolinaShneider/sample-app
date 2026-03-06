# AI File Assistant

Personal file storage with upload, browse, share (with optional PII redaction), and AI chat over PDFs. Sign in with Google, upload PDFs (≤50MB), manage files, share via public links, and ask questions over your documents.

## Tech stack

| Layer   | Technology      |
| ------- | --------------- |
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS v4 |
| Database | Neon Postgres |
| Auth    | NextAuth.js + Google |
| Storage | AWS S3 |
| AI      | OpenAI ChatGPT API |
| Deploy  | Vercel |

## Running locally

1. **Database setup**

   Create a Neon Postgres database and run the schema:

   ```bash
   psql $DATABASE_URL -f scripts/init-db.sql
   ```

2. **Environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with:

   - `DATABASE_URL` – Neon Postgres connection string (pooled)
   - `NEXTAUTH_SECRET` – random string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` – `http://localhost:3000`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – from [Google Cloud Console](https://console.cloud.google.com/)
   - `OPENAI_API_KEY` – OpenAI API key
   - `LLM_MODEL` – optional, defaults to `gpt-4.1-mini`
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET` – AWS credentials and bucket

3. **Google OAuth**

   In Google Cloud Console, create OAuth 2.0 credentials and add:

   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

4. **Start dev server**

   ```bash
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`.

## Features

- **Auth** – Google OAuth via NextAuth.js
- **Upload** – PDF files ≤50MB, stored in S3 via presigned PUT URLs
- **Browse** – List, download, and delete your files
- **Share** – Create public links with optional “Black out PII before sharing”
- **PII redaction** – Emails, phone numbers, SSN-like patterns replaced with `[REDACTED]`
- **Chat** – Ask questions over extracted text from your PDFs

## API routes

| Route | Method | Purpose |
| ----- | ------ | ------- |
| `/api/auth/[...nextauth]` | — | NextAuth handlers |
| `/api/files` | GET | List user files |
| `/api/files` | POST | Create upload (presigned URL + metadata) |
| `/api/files/[id]` | GET | File metadata |
| `/api/files/[id]` | DELETE | Delete file |
| `/api/files/[id]/download` | GET | Presigned download URL |
| `/api/files/[id]/confirm` | POST | Confirm upload & extract text |
| `/api/share` | POST | Create share link |
| `/api/share` | DELETE | Revoke share link |
| `/api/share/[token]` | GET | Get download URL for share (no auth) |
| `/api/chat` | POST | Chat over user’s PDF text |

## Vercel deployment

1. Import the repo into Vercel.
2. Add all env vars from `.env.example`.
3. Set `NEXTAUTH_URL` to your production URL (e.g. `https://your-app.vercel.app`).
4. In Google Cloud Console, add the production callback: `https://your-app.vercel.app/api/auth/callback/google`.

## Notes

- S3 uploads use presigned PUT URLs, so large files (up to 50MB) bypass Vercel’s 4.5MB body limit.
- After uploading a file, the client calls `/api/files/[id]/confirm` to trigger PDF text extraction for chat.
