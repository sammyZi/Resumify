# Requirements Document

## Introduction

The AI Resume Builder is a Next.js web application that helps users create professional resumes. Users authenticate through Supabase (email/password and Google OAuth), select a role-based template, and provide their profile information. To avoid re-entering the same details for every resume, the System maintains a reusable User_Profile (a persistent master record of personal, contact, work experience, education, and skills information) tied to the account, and pre-fills new resumes from that stored profile. An AI service (OpenAI) generates LaTeX source code from the user's data and selected template, which is then compiled into a downloadable PDF. Structured resume data, the reusable profile, and LaTeX source are persisted in the Supabase database, while generated PDF documents and binary assets are stored in Supabase Storage and served from there for download. Users can share generated resumes with recruiters (view/download) or with friends who can copy the underlying template. The application presents a professional interface in both light and dark modes using the Rubik typeface and follows established front-end practices for server state (TanStack Query) and client state (Zustand).

## Glossary

- **System**: The AI Resume Builder application as a whole.
- **Auth_Service**: The Supabase-backed component responsible for authentication, session management, and account lifecycle.
- **Template_Service**: The component that stores and provides role-based resume templates.
- **AI_Generator**: The component that calls OpenAI to produce LaTeX source from user data and a selected template.
- **LaTeX_Compiler**: The component that compiles LaTeX source into a PDF document.
- **Resume_Store**: The persistence component that stores user resume data and generated artifacts. The Resume_Store is backed by Supabase, using the Supabase database for structured Resume_Data and LaTeX_Source and using the File_Store for generated PDF artifacts.
- **File_Store**: The Supabase Storage component that stores binary artifacts, including generated PDF documents and template preview assets, and serves them for download.
- **Share_Service**: The component that creates and resolves shareable links for resumes.
- **UI**: The Next.js front-end presentation layer.
- **Theme_Manager**: The component that controls light and dark mode presentation.
- **User**: An authenticated person using the System to build a resume.
- **Recruiter_Share**: A shareable link that grants read and download access to a generated resume PDF.
- **Template_Share**: A shareable link that grants access to copy a resume's underlying template and structure.
- **Resume_Data**: The structured profile information (contact details, experience, education, skills) provided by a User.
- **User_Profile**: The reusable master record of a User's personal and contact information, work experience entries, education entries, and skills, persisted to the User account and used to pre-fill new resumes. The User_Profile is independent of any single resume and is shared as the starting point across all of a User's resumes.
- **Profile_Store**: The persistence component, backed by the Supabase database, that stores and retrieves the User_Profile for a User account.
- **LaTeX_Source**: The LaTeX text produced by the AI_Generator.
- **Session**: An authenticated user session managed by the Auth_Service.

## Requirements

### Requirement 1: Email and Password Authentication

**User Story:** As a visitor, I want to sign up and log in with my email and password, so that I can access and save my resumes securely.

#### Acceptance Criteria

1. WHEN a visitor submits a sign-up form with an email of 1 to 254 characters in valid email address format and a password of 8 to 128 characters, THE Auth_Service SHALL create a new account in an unconfirmed state and send a sign-up confirmation email within 60 seconds.
2. WHEN a visitor submits login credentials matching a confirmed account, THE Auth_Service SHALL establish a Session that remains valid for 30 minutes of inactivity and grant access to the User workspace.
3. IF a visitor submits login credentials that do not match a confirmed account, THEN THE Auth_Service SHALL reject the login, preserve any existing account unchanged, and display an authentication error message that does not indicate whether the email or the password was incorrect.
4. IF a visitor submits a sign-up form with an email that already has an account, THEN THE Auth_Service SHALL reject the sign-up, create no new account, and display a message indicating the email is already registered.
5. WHILE an account is unconfirmed, THE Auth_Service SHALL deny login and display a message instructing the User to confirm the account by email.
6. IF a visitor submits a sign-up form with an email not in valid email address format, or with a password shorter than 8 or longer than 128 characters, THEN THE Auth_Service SHALL reject the sign-up, create no account, and display a validation error message indicating the specific field requirement that was not met.
7. IF a visitor submits incorrect login credentials 5 consecutive times for the same email within a 15-minute window, THEN THE Auth_Service SHALL temporarily lock further login attempts for that email for 15 minutes and display a message indicating the account is temporarily locked.
8. IF a visitor activates a confirmation link more than 24 hours after it was sent, THEN THE Auth_Service SHALL reject the confirmation, keep the account in the unconfirmed state, and display a message indicating the link has expired with an option to resend the confirmation email.

### Requirement 2: Google OAuth Authentication

**User Story:** As a visitor, I want to log in with my Google account, so that I can access the System without managing a separate password.

#### Acceptance Criteria

1. WHEN a visitor selects the Google sign-in option, THE Auth_Service SHALL redirect the visitor to the Google consent screen within 3 seconds.
2. WHEN the Google OAuth flow completes successfully for an email that has no existing account, THE Auth_Service SHALL provision a new confirmed account, establish a Session, and grant access to the User workspace.
3. WHEN the Google OAuth flow completes successfully for an email that already has an account, THE Auth_Service SHALL authenticate the existing account, establish a Session, and grant access to the User workspace.
4. IF the visitor cancels the Google OAuth flow, THEN THE Auth_Service SHALL return the visitor to the login page, establish no Session, and display a message indicating sign-in was cancelled.
5. IF the Google OAuth flow fails for any reason other than cancellation, THEN THE Auth_Service SHALL return the visitor to the login page, establish no Session, and display a sign-in error message.

### Requirement 3: Account Recovery and Email Templates

**User Story:** As a User, I want to reset a forgotten password, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a User submits a forgot-password request with a registered email address, THE Auth_Service SHALL send a password-reset email using the custom forgot-password template within 60 seconds, and the email SHALL contain a password-reset link associated with a reset token that expires 60 minutes after issuance.
2. IF a User submits a forgot-password request with an email address that is not registered, THEN THE Auth_Service SHALL display the same confirmation indication as for a registered email without sending a reset email and without disclosing whether the email is registered.
3. WHEN a User opens a password-reset link whose reset token has not expired and has not been previously used, THE System SHALL display a password-reset page that accepts a new password and a password confirmation field.
4. WHEN a User submits a new password between 8 and 128 characters on a valid password-reset page, THE Auth_Service SHALL update the account password, invalidate the reset token, and display a confirmation indication that the password change succeeded.
5. IF a User submits a new password that is shorter than 8 characters, longer than 128 characters, or does not match the confirmation field, THEN THE Auth_Service SHALL reject the submission, retain the existing account password unchanged, and display an error message indicating the specific validation failure.
6. IF a User opens a password-reset link whose reset token is expired, already used, or invalid, THEN THE System SHALL display an error message indicating the link is no longer valid and offer to send a new reset email.
7. THE Auth_Service SHALL use the custom sign-up confirmation template for sign-up confirmation emails.

### Requirement 4: Role-Based Template Selection

**User Story:** As a User, I want to choose a resume template based on my target role, so that my resume matches the conventions of that role.

#### Acceptance Criteria

1. WHEN a User opens the template gallery, THE Template_Service SHALL display all available role-based templates, each with a visual preview, within 3 seconds.
2. IF no role-based templates are available when a User opens the template gallery, THEN THE Template_Service SHALL display an empty-state message indicating that no templates are available and SHALL retain the current resume's existing template.
3. WHEN a User selects a template, THE System SHALL associate the selected template with the current resume and SHALL display a confirmation indicating the template was applied.
4. IF associating a selected template with the current resume fails, THEN THE System SHALL display an error message indicating the template could not be applied and SHALL retain the previously associated template.
5. WHERE a User has not selected a template, THE System SHALL apply a single predefined default template to the current resume.
6. WHEN a User filters templates by a role category, THE Template_Service SHALL display only templates that belong to the selected role category, within 3 seconds.
7. IF no templates belong to the role category selected by a User, THEN THE Template_Service SHALL display an empty-state message indicating that no templates match the selected category.

### Requirement 5: Resume Data Entry

**User Story:** As a User, I want to enter my profile information, so that the System can generate a resume from my details.

#### Acceptance Criteria

1. THE System SHALL provide input fields for contact details (including full name and email address), work experience entries, education entries, and skills, accepting up to 50 entries per repeatable section, up to 200 characters per single-line text field, and up to 2,000 characters per multi-line description field.
2. WHEN a User saves Resume_Data that passes validation, THE Resume_Store SHALL persist the Resume_Data to the User account.
3. IF a User submits Resume_Data with a required field (full name or email address) left empty, THEN THE System SHALL reject the save and identify each missing required field.
4. WHEN a User loads a previously saved resume, THE Resume_Store SHALL return Resume_Data equivalent to the Resume_Data last saved for that resume.
5. WHEN the Resume_Store completes persisting Resume_Data, THE System SHALL display a save-confirmation indication to the User.
6. IF a User submits Resume_Data containing an email address that does not match a valid email format, a single-line field exceeding 200 characters, or a description field exceeding 2,000 characters, THEN THE System SHALL reject the save and identify each invalid field.
7. IF the Resume_Store cannot persist the Resume_Data, THEN THE System SHALL display a save-failure indication, retain the entered Resume_Data in the input fields, and offer to retry.

### Requirement 6: AI LaTeX Generation

**User Story:** As a User, I want the System to generate LaTeX code from my data, so that I get a professionally formatted resume without writing LaTeX.

#### Acceptance Criteria

1. WHEN a User requests resume generation with saved Resume_Data and a selected template, THE AI_Generator SHALL produce, within 60 seconds, LaTeX_Source that incorporates every saved Resume_Data field and the selected template.
2. IF a User requests resume generation when no Resume_Data has been saved or no template is associated with the current resume, THEN THE System SHALL reject the request and display a message identifying each missing prerequisite (saved Resume_Data, selected template).
3. IF the AI_Generator returns an error or does not return LaTeX_Source within 60 seconds, THEN THE System SHALL display a generation-failure message, retain the saved Resume_Data and selected template unchanged, and offer to retry up to 3 attempts per generation request.
4. WHILE the AI_Generator is processing a request, THE UI SHALL display a generation-in-progress indicator and remove that indicator when the request completes, fails, or times out.
5. WHEN the AI_Generator returns LaTeX_Source, THE Resume_Store SHALL persist the LaTeX_Source with the current resume.
6. IF the Resume_Store cannot persist the returned LaTeX_Source, THEN THE System SHALL display a save-failure message and retain the returned LaTeX_Source so the User can retry the save.

### Requirement 7: PDF Compilation

**User Story:** As a User, I want my LaTeX resume compiled into a PDF, so that I can download and use it.

#### Acceptance Criteria

1. WHEN valid LaTeX_Source is available for a resume, THE LaTeX_Compiler SHALL compile the LaTeX_Source into a PDF document within 30 seconds.
2. WHEN a PDF document is compiled, THE Resume_Store SHALL persist the PDF document to the File_Store and associate the stored PDF document with the current resume.
3. WHEN a PDF document has been persisted to the File_Store, THE System SHALL provide the User a download action that serves the stored PDF document.
4. IF the LaTeX_Compiler cannot compile the LaTeX_Source, THEN THE System SHALL display a compilation-error message that includes the compiler error detail and SHALL retain the existing LaTeX_Source unchanged.
5. IF the compilation does not complete within 30 seconds, THEN THE System SHALL abort the compilation and display a timeout-error message indicating that compilation exceeded the time limit.
6. IF the Resume_Store cannot persist the compiled PDF document to the File_Store, THEN THE System SHALL display a save-failure message indicating the PDF document could not be stored and SHALL offer to retry the persistence.

### Requirement 8: Resume Sharing

**User Story:** As a User, I want to share my resume with recruiters or friends, so that recruiters can view it and friends can reuse my template.

#### Acceptance Criteria

1. WHEN a User creates a Recruiter_Share for a resume, THE Share_Service SHALL generate a unique link that grants read and download access to the resume PDF and that remains valid until the User revokes it.
2. WHEN a User creates a Template_Share for a resume, THE Share_Service SHALL generate a unique link that grants access to copy the resume template and structure, excluding the source resume's Resume_Data, and that remains valid until the User revokes it.
3. WHEN a visitor opens a valid Recruiter_Share link, THE System SHALL display the resume PDF and provide a download action for the PDF.
4. WHEN an authenticated visitor opens a valid Template_Share link, THE System SHALL create a new resume in that visitor's account using the shared template and structure, excluding the source resume's Resume_Data.
5. WHEN an unauthenticated visitor opens a valid Template_Share link, THE System SHALL redirect the visitor to the login page and, after authentication, create a new resume in that visitor's account using the shared template and structure.
6. IF a visitor opens a share link that has been revoked or does not exist, THEN THE Share_Service SHALL deny access, retain the source resume unchanged, and display a link-unavailable message.
7. WHEN a User revokes a share link, THE Share_Service SHALL deny all subsequent access through that link and display a link-unavailable message to any visitor using it.

### Requirement 9: Theme and Visual Presentation

**User Story:** As a User, I want a professional interface in light and dark mode with consistent typography, so that the application is comfortable to use in any environment.

#### Acceptance Criteria

1. THE UI SHALL render all text using the Rubik typeface.
2. IF the Rubik typeface fails to load, THEN THE UI SHALL render text using a system sans-serif fallback typeface.
3. WHEN a User selects light mode, THE Theme_Manager SHALL apply the light-mode color scheme across the entire UI within 1 second and without requiring a page reload.
4. WHEN a User selects dark mode, THE Theme_Manager SHALL apply the dark-mode color scheme across the entire UI within 1 second and without requiring a page reload.
5. THE Theme_Manager SHALL render text and its background with a contrast ratio of at least 4.5:1 in both light mode and dark mode.
6. WHEN a User returns to the System within an active Session, THE Theme_Manager SHALL apply the theme last selected by the User.
7. WHEN a User accesses the System with no previously selected theme stored for the active Session, THE Theme_Manager SHALL apply light mode as the default theme.

### Requirement 10: Access Control

**User Story:** As a User, I want only authorized people to access my resume data, so that my personal information stays private.

#### Acceptance Criteria

1. IF an unauthenticated visitor requests a User workspace route, THEN THE System SHALL redirect the visitor to the login page within 2 seconds and SHALL NOT return any Resume_Data content in the response.
2. IF a User requests Resume_Data that belongs to another account, THEN THE System SHALL deny the request, return an access-denied error indicating the User is not authorized, and SHALL NOT disclose the existence or contents of that Resume_Data.
3. WHERE a resume is accessed through a valid share link, THE Share_Service SHALL grant only the access level (view-only or edit) defined by that share link and SHALL reject any operation that exceeds that access level.
4. IF a resume is accessed through an expired or revoked share link, THEN THE Share_Service SHALL deny access and return an error indicating that the share link is no longer valid.
5. IF a resume is accessed through a share link that does not match any existing share record, THEN THE Share_Service SHALL deny access and return an error indicating that the link is invalid.

### Requirement 11: User Profile Persistence and Reuse

**User Story:** As a User, I want my personal details, experience, education, and skills stored in a reusable profile, so that I do not have to re-enter the same information every time I create a new resume.

#### Acceptance Criteria

1. WHEN a User saves a User_Profile that passes validation, THE Profile_Store SHALL persist the User_Profile to the User account and display a save-confirmation indication.
2. WHEN a User updates an existing User_Profile with changes that pass validation, THE Profile_Store SHALL replace the stored User_Profile with the updated values for that User account.
3. WHEN a User loads a previously saved User_Profile, THE Profile_Store SHALL return a User_Profile equivalent to the User_Profile last saved for that User account.
4. WHEN a User creates a new resume and a saved User_Profile exists for that User account, THE System SHALL pre-fill the new resume's Resume_Data with the values from the stored User_Profile.
5. WHERE a User creates a new resume and no saved User_Profile exists for that User account, THE System SHALL present empty Resume_Data input fields.
6. WHEN a User edits Resume_Data that was pre-filled from the User_Profile, THE System SHALL apply the edits only to the current resume's Resume_Data and SHALL retain the stored User_Profile unchanged.
7. WHERE a User chooses to save the current resume's Resume_Data back to the profile, THE Profile_Store SHALL update the stored User_Profile with the current resume's Resume_Data values for that User account.
8. IF a User submits a User_Profile with a required field (full name or email address) left empty, an email address that does not match a valid email format, a single-line field exceeding 200 characters, or a description field exceeding 2,000 characters, THEN THE System SHALL reject the save, retain the entered values in the input fields, and identify each missing or invalid field.
9. IF the Profile_Store cannot persist the User_Profile, THEN THE System SHALL display a save-failure indication, retain the entered values in the input fields, and offer to retry.
