# Resumify

AI-powered resume builder. Create a profile once, generate polished resumes from
10 code-based templates, refine any section with AI, and share clean,
clickable PDFs with recruiters — all in the browser.

Built with Next.js 16 (App Router + Turbopack), Supabase (auth + Postgres +
storage), and OpenAI.

---

## Features

- **Profile-first workflow** — store your details once (contact, summary,
  experience, projects, education, certifications, skills, achievements) and
  reuse them across resumes.
- **10 distinct templates** — Classic, Modern, Minimal, Technical, Elegant,
  Bold, Timeline, Compact, Aurora, and Meridian. Each is a unique HTML/CSS
  design (no LaTeX), browseable in a gallery with live preview.
- **Per-field AI refine** — refine the summary, individual experience,
  education, and project entries, or skills, inline with a single click.
  Works even before the resume is saved.
- **PDF import** — upload an existing PDF resume and have its content parsed
  into structured fields.
- **Server-side PDF export** — clean, US-Letter PDFs with clickable links
  (email, phone, socials, project live/repo URLs), rendered with Puppeteer.
- **Sharing** — generate recruiter links (view + download PDF) and template
  links (let others copy the design without your personal data). Links are
  manageable and revocable; revoking permanently deletes the link.
- **Auth** — email/password and Google OAuth via Supabase, with session
  refresh handled in `proxy.ts`.
- **Light/dark theme** with a consistent green + charcoal + cream palette.

---

## Tech Stack

| Area            | Choice                                            |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)                |
| Language        | TypeScript, React 19                              |
| Auth & DB       | Supabase (Postgres, Auth, Storage, RLS)           |
| AI              | OpenAI API                                        |
| PDF rendering   | Puppeteer (local) / `@sparticuz/chromium-min` + `puppeteer-core` (serverless) |
| PDF parsing     | `pdf-parse`, `pdf.js-extract`                     |
| Data fetching   | TanStack Query                                    |
| State           | Zustand                                            |
| Validation      | Zod                                               |
| Testing         | Vitest, Testing Library, fast-check               |

---

## Getting Started

### Prerequisites

- Node.js 22.x (the serverless Chromium dependency requires Node ≥ 22.17)
- A Supabase project
- An OpenAI API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```dotenv
# ── Supabase ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, keep secret

# ── OpenAI ────────────────────────────────────────────────────────────────
OPENAI_API_KEY=your-openai-key

# ── PDF rendering (optional) ───────────────────────────────────────────────
# Override the serverless Chromium pack URL if you bump @sparticuz/chromium-min.
# CHROMIUM_PACK_URL=https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar
```

> Never commit `.env.local`. The anon key is safe for the browser; the service
> role key and OpenAI key are server-only.

### 3. Set up the database

Apply the migrations in `supabase/migrations/` to your Supabase project (via the
Supabase CLI or the SQL editor, in filename order). They create the resume and
share tables, row-level security policies, storage, and the schema for contact
info, links, projects, certifications, achievements, and resume titles.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the dev server (Turbopack)     |
| `npm run build`      | Production build                     |
| `npm run start`      | Serve the production build           |
| `npm test`           | Run the test suite once              |
| `npm run test:watch` | Run tests in watch mode              |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, sign-up, password reset, OAuth flows
│   ├── (workspace)/         # Authenticated app: resumes, profile, templates
│   │   ├── resumes/         # Resume list + editor + preview
│   │   ├── templates/       # Template gallery + selection
│   │   ├── profile/         # Reusable profile editor
│   │   └── _components/     # Resume form, share modal, refine UI, toasts
│   ├── api/                 # Route handlers (resumes, profile, shares, PDF, refine)
│   ├── s/[token]/           # Public recruiter share view
│   ├── t/[token]/           # Public template share view
│   └── _components/         # Landing page
├── components/              # Shared UI (brand logo, query provider)
├── lib/
│   ├── templates/           # Template registry, document renderer, PDF builder
│   ├── services/            # Auth, share, AI refiner
│   ├── stores/              # Resume store, UI store
│   ├── supabase/            # Server/client Supabase helpers
│   ├── types.ts             # Domain types (ResumeData, Share, …)
│   └── validation.ts        # Zod schemas
├── proxy.ts                 # Session-refresh middleware (Next 16 renamed middleware → proxy)
└── ...
supabase/migrations/         # SQL schema + RLS migrations
```

---

## How PDF Generation Works

Resumes render to a self-contained HTML string (`lib/templates/build-resume-html.ts`)
with all styles inlined and links as real `<a>` elements, then Puppeteer prints
it to a US-Letter PDF with clickable annotations.

- **Local dev** uses the full `puppeteer` package (bundled Chromium).
- **Serverless (Vercel)** uses `puppeteer-core` + `@sparticuz/chromium-min`,
  which downloads the Chromium binary from a remote pack URL at runtime. This
  avoids bundling a large binary that the build step would relocate.

The launcher logic lives in `src/lib/templates/pdf-browser.ts`.

---

## Deployment (Vercel)

1. Import the repository into Vercel.
2. Set the environment variables from `.env.local` in the project settings.
3. Set the **Node.js version to 22.x** (required by `@sparticuz/chromium-min`).
4. Add your deployed `/auth/callback` URL to the Supabase auth redirect allowlist
   so Google OAuth completes correctly.
5. Deploy.

> The first PDF request after a cold start is slightly slower while the Chromium
> pack downloads to `/tmp`; warm instances reuse it.

---

## License

Private project. All rights reserved.
