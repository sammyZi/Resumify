# Implementation Plan: AI Resume Builder

## Overview

This plan implements the AI Resume Builder as a Next.js (App Router) application backed by Supabase (Auth, Postgres + RLS, Storage), OpenAI for LaTeX generation, and a dedicated Tectonic compile service for PDF output. Tasks proceed from project scaffolding and shared primitives outward to data stores, external-service adapters, server flows, sharing, and UI. Each task builds on previous ones and ends with wiring into the running application. Pure-logic property-based tests (fast-check, ≥100 iterations) accompany the modules that implement each of the 19 correctness properties from the design.

The implementation language is **TypeScript** (Next.js App Router), as specified in the design. Property-based tests use **fast-check**.

## Tasks

- [x] 1. Scaffold project, tooling, and shared primitives
  - [x] 1.1 Initialize Next.js App Router project and core dependencies
    - Create a TypeScript Next.js App Router project with the workspace/server/public route folder structure (`app/`, `app/(auth)`, `app/(workspace)`, `app/api`, `app/s/[token]`, `app/t/[token]`)
    - Install and configure runtime dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`, `zustand`, `zod`, `openai`
    - Install and configure dev/test dependencies: `vitest`, `fast-check`, `@testing-library/react`
    - Add a `Result<T, E>` discriminated-union type and shared error types (`CompileError`, `ShareError`) under `lib/result.ts`
    - Add typed environment config module that reads server-only secrets (Supabase service role key, OpenAI key, compiler URL/secret) and public Supabase config, never exposing server secrets to the client
    - _Requirements: 9.1, 10.1_

  - [x] 1.2 Define shared domain types
    - Create `lib/types.ts` with `ExperienceEntry`, `EducationEntry`, `ResumeData`, `UserProfile`, `Template`, `Resume`, `Share` matching the design's TypeScript domain types
    - _Requirements: 5.1, 11.1_

  - [x] 1.3 Implement shared validation schema for Resume_Data and User_Profile
    - Create `lib/validation.ts` with a single Zod-based schema shared by `Resume_Data` and `User_Profile`: `fullName` required/non-empty-after-trim/≤200, `email` required/valid-format/≤254, single-line fields ≤200, description fields ≤2000, repeatable sections ≤50 entries each
    - Implement a `validateResumeData(input)` function returning `Result` that, on failure, returns the complete set of failing fields (not just the first)
    - _Requirements: 5.1, 5.3, 5.6, 11.8_

  - [ ]* 1.4 Write property test for validation soundness
    - **Property 1: Resume/Profile validation soundness**
    - **Validates: Requirements 5.1, 5.3, 5.6, 11.8**
    - Generators cover boundary lengths (0/8/200/254/2000), whitespace-only names, exactly 50 vs 51 entries, non-ASCII; assert accept iff all rules hold and rejection lists exactly the violating fields
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 1`

- [x] 2. Establish Supabase client wiring and database schema
  - [x] 2.1 Create Supabase client factories
    - Create `lib/supabase/server.ts` (cookie-bound session client for Route Handlers/Server Components), `lib/supabase/service.ts` (service-role client, server-only, for share resolution), and `lib/supabase/browser.ts`
    - _Requirements: 10.1, 10.2_

  - [x] 2.2 Author database schema migration
    - Create SQL migration defining `user_profiles`, `resumes`, `templates`, and `shares` tables with columns and FKs per the design ER model (jsonb for experience/education/skills, `latex_source`, `pdf_path`, share `token`/`kind`/`revoked`)
    - _Requirements: 5.2, 6.5, 7.2, 8.1, 11.1_

  - [x] 2.3 Author Row-Level Security policies and Storage bucket migration
    - Enable RLS and add `auth.uid()`-keyed policies for `user_profiles`, `resumes`, `shares`; add public-read policy for `templates`
    - Create a private Storage bucket for generated PDFs and template preview assets
    - _Requirements: 10.1, 10.2, 7.2_

  - [ ]* 2.4 Write smoke test for RLS and private bucket configuration
    - Assert RLS is enabled on `user_profiles`, `resumes`, `shares` and the PDF bucket is private
    - _Requirements: 10.1, 10.2, 7.2_

- [ ] 3. Implement Profile_Store and Resume_Store with pre-fill logic
  - [ ] 3.1 Implement Profile_Store
    - Create `lib/stores/profile-store.ts` implementing `getProfile(userId)` and `saveProfile(userId, input)` against Postgres, running shared validation before persisting and returning `Result`
    - _Requirements: 11.1, 11.2, 11.3, 11.8, 11.9_

  - [ ] 3.2 Implement Resume_Store core persistence
    - Create `lib/stores/resume-store.ts` implementing `createResume(userId, prefill?, template?)`, `getResume`, `saveResumeData` (with shared validation), `saveLatexSource`, and `attachPdf`, each returning `Result`
    - Implement profile pre-fill: when `prefill` is provided, populate new resume fields from it; otherwise leave fields empty
    - Ensure editing resume data does not mutate the stored profile; implement `saveResumeData` as resume-scoped only
    - _Requirements: 5.2, 5.4, 5.7, 6.5, 6.6, 7.2, 11.4, 11.5, 11.6_

  - [ ] 3.3 Implement save-resume-data-back-to-profile operation
    - Add a function that writes the current resume's `Resume_Data` values into the stored `User_Profile` for the user
    - _Requirements: 11.7_

  - [ ]* 3.4 Write property test for persistence round-trip equivalence
    - **Property 3: Persistence round-trip equivalence**
    - **Validates: Requirements 5.2, 5.4, 6.5, 11.1, 11.2, 11.3**
    - Use an in-memory fake store; assert save-then-load equivalence and that successive valid writes return the most recent values
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 3`

  - [ ]* 3.5 Write property test for profile pre-fill on resume creation
    - **Property 4: Profile pre-fill on resume creation**
    - **Validates: Requirements 11.4, 11.5**
    - Assert new resume equals stored profile when one exists, and empty fields when none exists
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 4`

  - [ ]* 3.6 Write property test for resume-edit isolation from stored profile
    - **Property 5: Resume edits are isolated from the stored profile**
    - **Validates: Requirements 11.6, 11.7**
    - Assert edits to a pre-filled resume leave the stored profile unchanged unless explicitly saved back, after which the loaded profile equals the resume data
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 5`

- [ ] 4. Wire Profile and Resume route handlers
  - [ ] 4.1 Implement profile route handlers
    - Create `GET/PUT /api/profile` calling Profile_Store, returning save-confirmation on success and field-level errors / save-failure-with-retry on failure
    - _Requirements: 11.1, 11.2, 11.3, 11.8, 11.9_

  - [ ] 4.2 Implement resume list/create and load/save route handlers
    - Create `GET/POST /api/resumes` (list; create with profile pre-fill) and `GET/PUT /api/resumes/:id` (load; save with validation, save-confirmation, save-failure/retry)
    - Create `POST /api/resumes/:id/save-to-profile`
    - Enforce authenticated session on all routes; deny/redirect unauthenticated requests with no resume content
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 11.4, 11.5, 11.7, 10.1_

  - [ ]* 4.3 Write property test for owner-only data access
    - **Property 14: Owner-only data access**
    - **Validates: Requirements 10.1, 10.2**
    - Assert requests by a non-owner (and unauthenticated requests to protected routes) are denied/redirected and disclose no resume content or existence
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 14`

  - [ ]* 4.4 Write unit tests for save-confirmation and save-failure/retry branches
    - Cover save-confirmation on success and save-failure-with-retry with a mocked failing store
    - _Requirements: 5.5, 5.7, 11.9_

- [ ] 5. Checkpoint - data layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Template_Service and template UI wiring
  - [ ] 6.1 Implement Template_Service logic
    - Create `lib/services/template-service.ts` with `listTemplates(roleCategory?)` (exact category filtering), `getDefaultTemplate()` (single predefined default), and `applyTemplate(resumeId, templateId)` returning `Result`
    - On apply failure, retain previously associated template; resolve effective template to the default when none selected
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 6.2 Implement template route handlers
    - Create `GET /api/templates` (list/filter) and `PUT /api/resumes/:id/template` (apply selected template, confirmation/error)
    - _Requirements: 4.1, 4.3, 4.4, 4.6, 4.7_

  - [ ]* 6.3 Write property test for template selection and default resolution
    - **Property 6: Template selection and default resolution**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
    - Assert applying a template sets the association, failed application retains the prior template, and no-selection resolves to the single default
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 6`

  - [ ]* 6.4 Write property test for template category filtering
    - **Property 7: Template category filtering soundness and completeness**
    - **Validates: Requirements 4.6, 4.7**
    - Assert filtered results contain exactly templates of the selected category, including zero-match categories
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 7`

  - [ ]* 6.5 Write unit test for gallery rendering with previews and empty states
    - Cover all-templates-with-previews render and empty-state messages
    - _Requirements: 4.1, 4.2, 4.7_

- [ ] 7. Implement AI_Generator (OpenAI) and generation flow
  - [ ] 7.1 Implement AI_Generator adapter
    - Create `lib/services/ai-generator.ts` with `generateLatex({ resumeData, template })`: build a prompt from validated data + template, call OpenAI, enforce a 60-second budget, and retry up to 3 attempts per request, returning `Result`
    - _Requirements: 6.1, 6.3_

  - [ ] 7.2 Implement generation prerequisite gating and route handler
    - Create `POST /api/resumes/:id/generate` that checks prerequisites (saved Resume_Data present AND template associated) before calling the generator, listing exactly the missing prerequisites when gating fails
    - On success, persist `LaTeX_Source` via Resume_Store; on persist failure show save-failure and retain LaTeX for retry; on generator error/timeout return failure and leave data + template unchanged
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [ ]* 7.3 Write property test for generation prerequisite gating
    - **Property 8: Generation prerequisite gating**
    - **Validates: Requirements 6.2**
    - Over all combinations of (data present?, template present?), assert permit iff both present and the response lists exactly the missing prerequisites otherwise
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 8`

  - [ ]* 7.4 Write property test for bounded, state-preserving retry
    - **Property 9: Generation retry is bounded and state-preserving**
    - **Validates: Requirements 6.3**
    - With an always-failing in-memory generator, assert at most 3 attempts and unchanged saved data + template
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 9`

  - [ ]* 7.5 Write integration test for OpenAI LaTeX generation within budget
    - Assert generation returns LaTeX incorporating every saved field + template within the 60s budget (mocked/recorded OpenAI)
    - _Requirements: 6.1_

- [ ] 8. Implement File_Store, LaTeX_Compiler, and compilation flow
  - [ ] 8.1 Implement File_Store (Supabase Storage adapter)
    - Create `lib/services/file-store.ts` with `putPdf(path, pdf)` and `getSignedDownloadUrl(path, ttlSeconds)` against the private bucket, returning `Result`
    - _Requirements: 7.2, 7.3_

  - [ ] 8.2 Implement LaTeX_Compiler adapter
    - Create `lib/services/latex-compiler.ts` with `compile(latex)` that POSTs to the internal Tectonic service behind a server-only secret, enforces a 30-second timeout, and surfaces `CompileError` detail on failure, returning `Result`
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ] 8.3 Implement compile and download route handlers
    - Create `POST /api/resumes/:id/compile`: compile LaTeX, on success store PDF via File_Store and `attachPdf` via Resume_Store; on compile error return detail and retain LaTeX; on timeout return timeout error; on storage failure offer retry persistence
    - Create `GET /api/resumes/:id/download` returning a short-lived signed URL after an ownership check
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 8.4 Write property test for compilation failure preserving LaTeX source
    - **Property 10: Compilation failure preserves LaTeX source**
    - **Validates: Requirements 7.4, 7.5**
    - With an in-memory failing/timing-out compiler, assert stored `LaTeX_Source` is unchanged
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 10`

  - [ ]* 8.5 Write unit/integration tests for compile timeout and PDF storage flow
    - Cover the compile-timeout branch with a slow mock compiler, and the integration path where valid LaTeX compiles, the PDF is stored, the resume is associated, and download serves it
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 9. Checkpoint - generation and compilation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Auth_Service and authentication flows
  - [ ] 10.1 Implement sign-up credential validation and sign-up handler
    - Create `lib/services/auth-service.ts` with `signUp(email, password)`: validate email (1–254, valid format) and password (8–128), reject duplicates with an "already registered" message, create no account on invalid input, and trigger the custom confirmation email
    - Create `POST /auth/sign-up` route handler wiring the above with field-specific validation errors
    - _Requirements: 1.1, 1.4, 1.6, 3.7_

  - [ ] 10.2 Implement login, lockout, and non-disclosure
    - Add `login(email, password)` establishing a 30-minute-inactivity session; deny unconfirmed accounts; return a generic auth error that does not reveal whether email or password was wrong; enforce a 5-failures-in-15-minutes lockout for 15 minutes
    - Create `POST /auth/login` route handler
    - _Requirements: 1.2, 1.3, 1.5, 1.7_

  - [ ] 10.3 Implement token validity logic (confirmation and reset)
    - Add pure functions for token validity: confirmation token valid iff used within 24h of issuance; reset token valid iff used within 60min and not previously used (single-use after successful reset)
    - _Requirements: 1.8, 3.1, 3.4, 3.6_

  - [ ] 10.4 Implement password reset and forgot-password flow
    - Add `requestPasswordReset(email)` returning a uniform outward response regardless of registration (custom forgot-password template, 60-min token for registered emails) and `resetPassword(token, newPassword)` enforcing 8–128 + confirmation match, updating password, invalidating token
    - Add `resendConfirmation(email)` for expired confirmation links
    - Create `POST /auth/forgot-password`, `GET/POST /reset-password` (custom in-app reset page), and `POST /auth/resend-confirmation` route handlers, including link-invalid + resend messaging
    - _Requirements: 1.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 10.5 Implement Google OAuth flow
    - Add `startGoogleOAuth()` and `completeOAuth(code)`; create `GET /auth/oauth/google` (redirect within 3s) and `GET /auth/callback` (provision new confirmed account or authenticate existing; handle cancellation and generic failure with no session)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 10.6 Write property test for sign-up credential validation soundness
    - **Property 2: Sign-up credential validation soundness**
    - **Validates: Requirements 1.6**
    - Generators cover password boundaries (7/8/128/129) and invalid/valid email formats; assert accept iff rules hold and rejection identifies the specific failing field with no account created
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 2`

  - [ ]* 10.7 Write property test for login and password-reset non-disclosure
    - **Property 15: Login and password-reset non-disclosure**
    - **Validates: Requirements 1.3, 3.2**
    - Assert failing-login errors are identical for wrong-email vs wrong-password, and forgot-password outward responses are identical for registered vs unregistered emails
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 15`

  - [ ]* 10.8 Write property test for token validity by expiry and single use
    - **Property 16: Token validity by expiry and single use**
    - **Validates: Requirements 1.8, 3.1, 3.4, 3.6**
    - Generators cover boundary timestamps at 15min/60min/24h and used/unused state; assert validity rules and single-use invalidation after reset
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 16`

  - [ ]* 10.9 Write property test for login lockout threshold
    - **Property 17: Login lockout threshold**
    - **Validates: Requirements 1.7**
    - Generate timestamped failure sequences; assert lock iff ≥5 failures within the trailing 15-minute window and that the lock lasts 15 minutes
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 17`

  - [ ]* 10.10 Write unit/integration tests for auth branches and configuration
    - Cover duplicate-email sign-up (1.4), unconfirmed login (1.5), OAuth cancel/failure (2.4, 2.5); integration for sign-up→confirmation email + login session (1.1, 1.2) and OAuth provisioning (2.1–2.3); smoke test that custom email templates and reset redirect are configured
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.7_

- [ ] 11. Implement Share_Service and public share routes
  - [ ] 11.1 Implement Share_Service logic
    - Create `lib/services/share-service.ts` with `createShare(userId, resumeId, kind)` generating high-entropy unique opaque tokens and recording exact access level; `resolveShare(token)` enforcing existence + not-revoked + access level (service-role, RLS-bypassing but constrained); `revokeShare(userId, shareId)`; and `copyTemplateFromShare(token, intoUserId)` creating a new resume with template/structure only, excluding source `Resume_Data`
    - _Requirements: 8.1, 8.2, 8.4, 8.6, 8.7, 10.3, 10.4, 10.5_

  - [ ] 11.2 Implement share management route handlers
    - Create `POST /api/shares` (create recruiter/template share) and `POST /api/shares/:id/revoke`
    - _Requirements: 8.1, 8.2, 8.7_

  - [ ] 11.3 Implement public share routes
    - Create `GET /s/:token` (recruiter view + signed PDF download; link-unavailable on revoked/missing) and `GET /t/:token` (template copy landing; redirect unauthenticated to login then copy; copy for authenticated)
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 10.3, 10.4, 10.5_

  - [ ]* 11.4 Write property test for share token uniqueness and recorded access level
    - **Property 11: Share token uniqueness and recorded access level**
    - **Validates: Requirements 8.1, 8.2**
    - Over sequences of share creations, assert all tokens unique and each share records exactly its kind/access level
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 11`

  - [ ]* 11.5 Write property test for template-copy excluding source Resume_Data
    - **Property 12: Template-copy excludes source Resume_Data**
    - **Validates: Requirements 8.2, 8.4**
    - Assert a copied resume carries template/structure but none of the source resume's `Resume_Data` values
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 12`

  - [ ]* 11.6 Write property test for share access-control enforcement
    - **Property 13: Share access-control enforcement**
    - **Validates: Requirements 8.6, 8.7, 10.3, 10.4, 10.5**
    - Over share tokens and requested operations, assert access granted only for existing, non-revoked, in-scope operations; revoked/nonexistent/exceeding requests denied with source unchanged; post-revocation resolutions always denied
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 13`

  - [ ]* 11.7 Write unit tests for recruiter render and unauthenticated template redirect
    - Cover valid recruiter token rendering PDF + download (8.3) and unauthenticated template link redirect-then-copy (8.5)
    - _Requirements: 8.3, 8.5_

- [ ] 12. Implement Theme_Manager and global UI shell
  - [ ] 12.1 Implement Theme_Manager and Zustand theme slice
    - Create a Zustand theme slice and `Theme_Manager` client component toggling `data-theme` with CSS-variable light/dark palettes; persist selection to localStorage keyed to the session; resolve last-selected theme on return, defaulting to light when none stored
    - Load Rubik via `next/font` with a system sans-serif fallback stack; define palette tokens with ≥4.5:1 text/background contrast in both modes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 12.2 Set up TanStack Query provider and Zustand stores
    - Add a TanStack Query client provider with query keys `['profile']`, `['resumes']`, `['resume', id]`, `['templates', roleCategory]`, `['shares', resumeId]`, and Zustand slices for editor draft/dirty state, panel visibility, progress flags, and toasts
    - _Requirements: 9.6_

  - [ ]* 12.3 Write property test for theme resolution and persistence
    - **Property 18: Theme resolution and persistence**
    - **Validates: Requirements 9.3, 9.4, 9.6, 9.7**
    - Assert persist-then-resolve returns the same theme within the session, and resolves to light when none stored
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 18`

  - [ ]* 12.4 Write property test for theme contrast guarantee
    - **Property 19: Theme contrast guarantee**
    - **Validates: Requirements 9.5**
    - For each defined text/background token pair in both themes, assert computed contrast ratio ≥ 4.5:1
    - fast-check, ≥100 iterations; tag `Feature: ai-resume-builder, Property 19`

  - [ ]* 12.5 Write unit test for Rubik font-family with fallback
    - Assert Rubik is applied with a system sans-serif fallback
    - _Requirements: 9.1, 9.2_

- [ ] 13. Build authentication UI pages
  - [ ] 13.1 Implement auth pages
    - Build login, sign-up, forgot-password, custom password-reset, and confirmation-expired pages wired to the auth route handlers, rendering field-specific validation errors, generic auth errors, lockout/unconfirmed messages, and Google sign-in; include resend-confirmation and link-invalid messaging
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.4, 2.5, 3.2, 3.3, 3.5, 3.6_

- [ ] 14. Build workspace UI (profile, resume editor, template gallery)
  - [ ] 14.1 Implement User_Profile editor and resume list/editor
    - Build the `User_Profile` editor and resume list + `Resume_Data` editor forms using shared validation, TanStack Query mutations, save-confirmation/save-failure-retry feedback, and "save to profile" action; pre-fill new resumes from the stored profile
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 11.1, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

  - [ ] 14.2 Implement template gallery UI
    - Build the gallery with previews, role-category filter, empty states, selection confirmation, and apply-failure handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7_

- [ ] 15. Build generation, download, and sharing UI
  - [ ] 15.1 Implement generation and download panel
    - Build the generate button, in-progress indicator (driven by mutation pending state, removed on complete/fail/timeout), retry, missing-prerequisite messaging, compile action, and PDF download action
    - _Requirements: 6.2, 6.3, 6.4, 7.3, 7.4, 7.5, 7.6_

  - [ ] 15.2 Implement sharing panel and public share pages UI
    - Build the panel to create Recruiter_Share/Template_Share, list and revoke links, and the public recruiter PDF viewer/download and template-copy landing pages with link-unavailable messaging
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 15.3 Write integration test for generation/compile/download UI lifecycle
    - Cover the in-progress indicator lifecycle and end-to-end generate→compile→download wiring with mocked services
    - _Requirements: 6.4, 7.1, 7.2, 7.3_

- [ ] 16. Final checkpoint - integration and full test run
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP, though they validate the design's correctness properties and key branches.
- Each task references specific requirements for traceability.
- All 19 correctness properties are implemented as single fast-check property tests (≥100 iterations) placed close to the modules they validate, using in-memory fakes for external boundaries.
- External-service behavior (Supabase email/session, OpenAI, Tectonic, Storage) is covered by example/integration/smoke tests rather than property tests.
- Checkpoints provide incremental validation at the data layer, after generation/compilation, and at final integration.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "12.1", "12.2"] },
    { "id": 3, "tasks": ["1.4", "2.3", "3.1", "3.2", "12.3", "12.4", "12.5"] },
    { "id": 4, "tasks": ["2.4", "3.3", "3.4", "3.5", "3.6", "6.1", "7.1", "8.1", "8.2", "10.1", "10.3", "11.1", "13.1"] },
    { "id": 5, "tasks": ["4.1", "4.2", "4.3", "4.4", "6.2", "6.3", "6.4", "7.2", "8.3", "10.2", "10.4", "10.5", "11.2", "11.4", "11.5"] },
    { "id": 6, "tasks": ["6.5", "7.3", "7.4", "7.5", "8.4", "8.5", "10.6", "10.7", "10.8", "10.9", "10.10", "11.3", "14.1", "14.2"] },
    { "id": 7, "tasks": ["11.6", "11.7", "15.1", "15.2"] },
    { "id": 8, "tasks": ["15.3"] }
  ]
}
```
