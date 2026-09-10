# Security Smoke Test Report

Date: 2026-09-09  
Scope: React storefront, Laravel API, production HTTP behavior, dependency locks, authentication/authorization, tenant isolation, and uploads.

## Executive summary

No direct authorization bypass, cross-store product access, exposed committed secret, or obvious DOM-XSS sink was found. The existing authorization suite passed 68 tests with 300 assertions, and the live deployment correctly redirects HTTP to HTTPS, rejects unauthenticated JSON API requests, and does not grant CORS access to an untrusted origin.

The application should nevertheless be treated as **needing security maintenance** before it is considered hardened. The two most urgent items are unthrottled login/registration endpoints and outdated locked backend dependencies with published high-severity advisories. Missing browser security headers and bearer-token storage in `localStorage` increase the impact of any future frontend injection bug.

## High severity

### SEC-001 — Public login and registration are not rate limited

- Rule ID: AUTH-RATE-001
- Severity: High
- Location: `backend/routes/api.php:42-43`; `backend/app/Http/Controllers/AuthController.php:114-150`
- Evidence: `/register` and `/login` have no `throttle` middleware, and `login()` performs a password check without calling `RateLimiter`. Only verification resends and a few public content endpoints are currently rate limited.
- Impact: A remote attacker can attempt passwords repeatedly against customer, merchant, and administrator accounts. Registration can also be automated to create accounts and trigger verification mail, consuming database and mail-service capacity.
- Fix: Add separate named rate limiters for login and registration, keyed by normalized email plus client IP, return HTTP 429, and add feature tests. Consider a slower account-level backoff in addition to IP limiting.
- Mitigation: Alert on repeated failed logins and unusual registration volume. Keep the existing generic invalid-credential response.
- False positive notes: An upstream WAF may impose limits, but no such limit is visible in repository configuration and it was not asserted during the runtime smoke test.

### SEC-002 — Locked production PHP dependencies contain published advisories

- Rule ID: SUPPLY-PHP-001
- Severity: High
- Location: `backend/composer.lock`; `backend/composer.json:9-16`
- Evidence: `composer audit --locked --no-dev` reported 38 advisories affecting 12 production packages. The lock includes Laravel Framework `v12.44.0`, Symfony HttpKernel `v7.4.2`, Symfony Mime `v7.4.0`, and Guzzle `7.10.0`. Reported advisories include email/header injection, routing issues, host-confusion issues, and denial-of-service conditions.
- Impact: Applicable vulnerabilities may permit malicious email/header handling, unexpected redirect or host behavior, or service degradation. Email-related findings are relevant because registration sends verification messages.
- Fix: Update the Composer lock to patched versions within supported constraints, rerun `composer audit --no-dev`, then run the complete backend test suite before deployment.
- Mitigation: Keep `APP_DEBUG=false`, restrict outbound integrations, and monitor malformed request/mail failures until upgraded.
- False positive notes: Not every advisory is reachable in this application. The audit is dependency/version based; exploitability must be evaluated per package feature used.

## Medium severity

### SEC-003 — Bearer tokens are stored in browser localStorage without a CSP

- Rule ID: REACT-AUTH-001 / REACT-HEADERS-001
- Severity: Medium
- Location: `barbazamarketplace/src/api/EcommerceApi.js:31,142,224`; `barbazamarketplace/nginx/default.conf:6-67`
- Evidence: The API token is read from and written to `localStorage`. The production app-shell response does not include `Content-Security-Policy`, and the nginx configuration does not define one.
- Impact: Any future same-origin XSS or compromised first-party script could read a long-lived merchant or administrator token and send it off-site.
- Fix: First deploy a tested CSP that restricts scripts, frames, objects, and network destinations. Longer term, evaluate an HttpOnly, Secure, SameSite cookie session or shorter-lived token design; a cookie migration must include CSRF protection.
- Mitigation: Keep third-party scripts out of the app, shorten personal-access-token lifetime, and revoke inactive tokens.
- False positive notes: The static scan found no `dangerouslySetInnerHTML`, `eval`, `document.write`, or equivalent application sink. This reduces current likelihood but does not remove the token-theft impact if a future XSS is introduced.

### SEC-004 — Password changes do not revoke existing access tokens

- Rule ID: AUTH-TOKEN-001
- Severity: Medium
- Location: `backend/app/Http/Controllers/AuthController.php:161-184`
- Evidence: `changePassword()` updates the password and saves the user but does not delete existing Sanctum tokens. Login creates persistent personal access tokens at line 145.
- Impact: A previously stolen token remains valid after the account owner changes their password, frustrating incident recovery.
- Fix: Revoke all existing tokens after a successful password change, then either require a new login or deliberately issue one replacement token for the current device.
- Mitigation: Provide users/admins with active-session visibility and manual revocation.
- False positive notes: A global token-expiration policy may reduce exposure, but no explicit expiration was confirmed in this smoke test.

### SEC-005 — Browser hardening headers are missing

- Rule ID: REACT-HEADERS-001
- Severity: Medium
- Location: `barbazamarketplace/nginx/default.conf:6-67`
- Evidence: The live HTML response did not include CSP, `X-Content-Type-Options`, clickjacking protection (`frame-ancestors` or `X-Frame-Options`), `Referrer-Policy`, or `Permissions-Policy`.
- Impact: Missing defense-in-depth makes clickjacking, content-type confusion, referrer leakage, and a future injection defect easier to exploit.
- Fix: Add these headers centrally in nginx after testing a realistic CSP against image, API, font, and payment-proof flows.
- Mitigation: Start CSP in report-only mode at the external proxy if rollout risk is a concern, then enforce after violations are addressed.
- False positive notes: Headers could be injected by a CDN on other hostnames, but they were absent from the configured live origin tested on 2026-09-09.

## Low severity

### SEC-006 — Protected API requests without a JSON Accept header return HTTP 500

- Rule ID: API-ERROR-001
- Severity: Low
- Location: `backend/bootstrap/app.php:23-25`
- Evidence: Live unauthenticated requests to `/api/admin/users`, `/api/merchant/products`, and `/api/user` returned 500 when no `Accept: application/json` header was supplied. The same endpoints correctly returned 401 with the JSON Accept header used by the frontend.
- Impact: This is not an authentication bypass, but malformed/non-browser requests create misleading server errors and may pollute monitoring or amplify log volume.
- Fix: Render `AuthenticationException` as a JSON 401 for `api/*` regardless of the Accept header.
- Mitigation: Rate-limit repetitive unauthenticated failures and alert separately on true server exceptions.
- False positive notes: The production frontend always sends `Accept: application/json`, so normal UI behavior is unaffected.

### SEC-007 — Server implementation versions are disclosed

- Rule ID: HTTP-INFO-001
- Severity: Low
- Location: production reverse proxy/PHP configuration; nginx entry at `barbazamarketplace/nginx/default.conf:6`
- Evidence: Live API responses disclose `Server: nginx` and `X-Powered-By: PHP/8.2.33`.
- Impact: This gives automated scanners extra fingerprinting information. It does not create a vulnerability by itself.
- Fix: Disable PHP version exposure and configure the edge/proxy to suppress unnecessary server headers where practical.
- Mitigation: Keep the underlying packages patched; header suppression is only defense-in-depth.
- False positive notes: Some infrastructure providers may always add a generic `Server` header.

## Dependency note: frontend

`npm audit --omit=dev` reported 59 dependency findings: 2 critical, 30 high, 16 moderate, and 11 low. Most critical/high chains originate in Create React App build/dev tooling (`react-scripts`, webpack dev server, `shell-quote`, and `websocket-driver`) and are not shipped as executable Node services in the production nginx image. However, `react-router-dom@7.11.0` is a direct runtime dependency with published advisories, and `postcss@8.5.6` is a direct build dependency with published parsing/file-read advisories. Upgrade the frontend toolchain and React Router in a tested branch; do not use an unreviewed forced audit fix.

## Controls that passed

- 68 relevant Laravel feature tests passed with 300 assertions.
- Guest order creation is denied.
- Customer, merchant, and administrator roles are enforced by server middleware.
- Merchant product/order/category data is scoped to the merchant's store.
- Cross-store product editing and payment-proof access are denied.
- Payment proofs are stored privately and served only after ownership/role checks.
- Uploaded proofs and store images use server-side image, MIME, and size validation.
- Email verification is required, resend responses resist account enumeration, and resend throttling is tested.
- Public inquiry submission uses a honeypot and rate limiting.
- HTTP redirects to HTTPS on the live origin.
- Runtime CORS did not allow the tested attacker origin.
- No secret-bearing `.env` file or private key is tracked; placeholder examples only were found.
- No application use of `dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`, unsafe `postMessage`, or unprotected `_blank` links was found.

## Recommended remediation order

1. Add login and registration throttling with tests.
2. Update Composer dependencies and re-run the complete test suite/audit.
3. Upgrade React Router and plan migration away from the aging Create React App toolchain.
4. Add production security headers, beginning with a tested CSP.
5. Revoke access tokens on password change and define token expiration/session policy.
6. Normalize unauthenticated API errors to JSON 401 and reduce server fingerprinting.

## Commands executed

- Targeted Laravel authorization/authentication suite: 68 passed, 300 assertions.
- `composer audit --locked --no-dev`: 38 advisories across 12 production packages.
- `npm audit --omit=dev`: 59 dependency findings.
- Static secret and dangerous-browser-sink searches.
- Live HTTPS redirect, CORS, security-header, and unauthenticated endpoint checks against `https://ekoopmart.barbazampc.cloud`.

This was a non-destructive smoke test, not a penetration test. It did not attempt credential attacks, exploit payloads, destructive requests, or high-volume load testing.
