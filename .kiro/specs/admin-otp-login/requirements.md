# Requirements Document

## Introduction

This feature adds OTP-based phone login to the GetNear admin panel (https://admin.getnear.ai/) for users with `admin` or `agent` roles. Unlike the customer-facing OTP flow, this login flow is strictly login-only — it does not create new accounts. If the phone number does not belong to an existing admin or agent user, the login attempt is rejected.

The implementation reuses the existing Twilio Verify infrastructure for sending and verifying OTP codes, and adds a dedicated API endpoint that enforces the admin/agent role check before issuing a session.

## Glossary

- **Admin_Panel**: The administrative web application at https://admin.getnear.ai/ used by admin and agent users to manage the GetNear platform
- **OTP**: One-Time Password — a temporary numeric code sent via SMS to verify phone ownership
- **Admin_User**: A user record in the `users` table with `role = 'admin'`
- **Agent_User**: A user record in the `users` table with `role = 'agent'`
- **OTP_Login_API**: The API endpoint `POST /auth/admin-otp-verify` that verifies OTP and issues a session exclusively for admin/agent users
- **Send_OTP_API**: The existing API endpoint `POST /auth/send-otp` that sends an OTP code via Twilio Verify
- **Login_Page**: The admin panel login page at `/login` that provides the user interface for authentication
- **Twilio_Verify**: The third-party SMS verification service used to send and validate OTP codes

## Requirements

### Requirement 1: Send OTP for Admin Login

**User Story:** As an admin or agent user, I want to request an OTP code sent to my phone number, so that I can log in to the admin panel without a password.

#### Acceptance Criteria

1. WHEN an admin or agent user submits a valid E.164 phone number (matching pattern `^\+[1-9]\d{1,14}$`) and requests an OTP, THE Send_OTP_API SHALL send a 6-digit numeric OTP code to the provided phone number via Twilio Verify and return an HTTP 200 response with a success confirmation within 10 seconds
2. IF the Send_OTP_API receives a phone number that is not in valid E.164 format, THEN THE Send_OTP_API SHALL reject the request with HTTP status 400 and return a validation error response indicating the phone number format is invalid
3. IF the rate limit of 5 OTP requests per 15-minute sliding window per IP address has been exceeded, THEN THE Send_OTP_API SHALL reject further requests with HTTP status 429 and return an error response indicating the rate limit has been exceeded
4. IF the Twilio Verify service is unavailable or returns an error when sending the OTP, THEN THE Send_OTP_API SHALL return an HTTP 500 response with an error indicating the OTP could not be sent, without exposing internal service details

### Requirement 2: Verify OTP and Authenticate Admin/Agent

**User Story:** As an admin or agent user, I want to verify my OTP code and receive an access token, so that I can access the admin panel securely.

#### Acceptance Criteria

1. WHEN a valid 6-digit OTP is submitted with a phone number in E.164 format that belongs to an Admin_User or Agent_User, THE OTP_Login_API SHALL return an access token, refresh token, and user profile containing id, role, and name
2. WHEN a valid OTP is submitted with a phone number that does not exist in the users table, THE OTP_Login_API SHALL return an error with code `ACCOUNT_NOT_FOUND` and HTTP status 403
3. WHEN a valid OTP is submitted with a phone number that belongs to a user with a role other than `admin` or `agent`, THE OTP_Login_API SHALL return an error with code `ACCESS_DENIED` and HTTP status 403
4. WHEN an OTP that does not match the issued code or has exceeded the 10-minute expiration window is submitted, THE OTP_Login_API SHALL return an error with code `INVALID_OTP` and HTTP status 400
5. WHEN a valid OTP is submitted, THE OTP_Login_API SHALL verify the OTP code using Twilio Verify before performing the user lookup and role check
6. IF the Twilio Verify service is unreachable or returns a service error during OTP verification, THEN THE OTP_Login_API SHALL return an error with code `OTP_VERIFICATION_FAILED` and HTTP status 500 without performing the role check
7. IF the OTP verification request rate exceeds 5 attempts per phone number within a 15-minute window, THEN THE OTP_Login_API SHALL return an error with code `RATE_LIMIT_EXCEEDED` and HTTP status 429

### Requirement 3: Admin Login Page OTP UI

**User Story:** As an admin or agent user, I want a phone number input and OTP verification form on the admin login page, so that I can log in using my phone number.

#### Acceptance Criteria

1. THE Login_Page SHALL display a phone number input field with a country code selector defaulting to India (+91) that accepts exactly 10 digits for Indian numbers
2. WHEN the user submits a phone number in valid E.164 format, THE Login_Page SHALL disable the submit button, call the Send_OTP_API, and display a 6-digit OTP input field
3. IF the Send_OTP_API returns an error, THEN THE Login_Page SHALL display an error message indicating OTP delivery failed and allow the user to retry submission
4. WHEN the user submits the 6-digit OTP code, THE Login_Page SHALL disable the submit button, call the OTP_Login_API, and on success store the access token in localStorage and navigate to the dashboard
5. WHEN the OTP_Login_API returns an `ACCOUNT_NOT_FOUND` error, THE Login_Page SHALL display the message "No admin account found for this phone number"
6. WHEN the OTP_Login_API returns an `ACCESS_DENIED` error, THE Login_Page SHALL display the message "Access denied. This panel is for administrators and agents only."
7. WHEN the OTP_Login_API returns an `INVALID_OTP` error, THE Login_Page SHALL display the message "Invalid or expired OTP. Please try again."
8. WHEN 30 seconds have elapsed since the last OTP was sent, THE Login_Page SHALL enable a "Resend OTP" option that calls the Send_OTP_API again and resets the 30-second countdown
9. THE Login_Page SHALL retain the existing email and password login as an alternative login method

### Requirement 4: No Account Creation on OTP Login

**User Story:** As a system administrator, I want the admin OTP login to reject unregistered phone numbers, so that only pre-provisioned admin and agent users can access the panel.

#### Acceptance Criteria

1. WHEN the OTP_Login_API receives a verified OTP for a phone number not present in the `phone` column of the users table, THE OTP_Login_API SHALL reject the request with an HTTP 403 status and error code `ACCOUNT_NOT_FOUND` without creating any new user record in Supabase Auth or inserting any row into the users table
2. WHEN the OTP_Login_API receives a verified OTP for a phone number belonging to a user whose role is neither `admin` nor `agent`, THE OTP_Login_API SHALL reject the request with an HTTP 403 status and error code `ACCESS_DENIED` without modifying the user's existing role or creating a new session
3. THE OTP_Login_API SHALL perform the user lookup by exact match of the phone number in E.164 format against the `phone` column in the `users` table before creating or modifying any Supabase Auth records
4. IF the users table lookup query fails due to a database error, THEN THE OTP_Login_API SHALL reject the request with an HTTP 500 status and error code `AUTH_ERROR` without creating any new user record or session

### Requirement 5: Session Management After OTP Login

**User Story:** As an admin or agent user, I want my OTP login session to work the same as a password login session, so that I can use all admin panel features without interruption.

#### Acceptance Criteria

1. WHEN the OTP_Login_API issues a session, THE OTP_Login_API SHALL return a response body containing `access_token`, `refresh_token`, and a `user` object with `id`, `role`, and `name` fields, matching the same JSON structure as the existing password login endpoint (`/auth/login`)
2. WHEN the OTP_Login_API returns a successful session, THE Login_Page SHALL store the `access_token` value as `admin_token` and the `user.role` value as `admin_user_role` in localStorage, and SHALL store the `refresh_token` value in localStorage as `admin_refresh_token`
3. WHEN an OTP login session is established and the user role is `admin` or `agent`, THE Admin_Panel SHALL redirect the user to the `/dashboard` page within 2 seconds of receiving the successful API response
4. IF the OTP_Login_API returns a user whose role is neither `admin` nor `agent`, THEN THE Login_Page SHALL display an error message indicating access is denied and SHALL NOT store any tokens in localStorage or perform a redirect
5. WHEN the access token issued via OTP login is sent in the `Authorization: Bearer <token>` header, THE authentication middleware SHALL validate it using the same `supabaseAdmin.auth.getUser` verification as password-login tokens, with no difference in treatment
