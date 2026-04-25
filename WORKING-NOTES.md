# Marand Working Notes

Last updated: 2026-04-22
Repo: `/Users/mada/Documents/Playground/marand-client-preview`
Branch: `codex/marand-local-design`

## Purpose
This file is a compact operational snapshot so ongoing work does not depend on chat context alone.

## Current App Architecture
- Frontend: DigitalOcean App Platform static site component `marand-wf`
- Backend: DigitalOcean App Platform web service `marand-wf-backend-forms-api`
- Custom domains are attached to the new app:
  - `marand-print.ro`
  - `www.marand-print.ro`
- Preview domain:
  - `lobster-app-8rjea.ondigitalocean.app`

## Routing
- `/` -> static site `marand-wf`
- `/api` -> backend `marand-wf-backend-forms-api`

Verified:
- `https://marand-print.ro/api/health` returns `{"ok":true}`

## Oferta Flow
Page:
- `/Users/mada/Documents/Playground/marand-client-preview/oferta/index.html`

Backend:
- `/Users/mada/Documents/Playground/marand-client-preview/backend/forms-api/server.js`

Current flow:
1. Frontend asks backend for presigned upload URLs
2. Browser uploads files to DigitalOcean Spaces
3. Frontend submits form metadata to backend
4. Backend sends offer email to `office@marand-print.ro` via Zoho SMTP

## Current Blocking Issue
The form works better than before, but file uploads still fail.

Current observed behavior:
- Without attachment, the offer path is close to working
- With attachment, browser shows `Failed to fetch`
- Console previously showed Spaces CORS failure on upload

Likely remaining issue:
- Spaces CORS and/or signed upload headers are still mismatched

## Spaces Configuration
Bucket:
- `marand-uploads`

Region:
- `fra1`

Configured env values:
- `SPACES_REGION=fra1`
- `SPACES_BUCKET=marand-uploads`
- `SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com`
- `SPACES_CDN_BASE_URL=https://marand-uploads.fra1.digitaloceanspaces.com`

Current Spaces upload key:
- has `Read/Write/Delete`

Spaces CORS should allow:
- Origin: `https://marand-print.ro`
- Methods:
  - `GET`
  - `PUT`
  - `POST`
  - `HEAD`
- Allowed headers:
  - `Content-Type`
  - `x-amz-acl`
  - `x-amz-meta-origin`
- Max age:
  - `3600`

If preview-domain testing is needed, add a second rule for:
- `https://lobster-app-8rjea.ondigitalocean.app`

## Zoho Mail Status
Domain:
- `marand-print.ro`

Configured mailbox target:
- `office@marand-print.ro`

Already done:
- MX verified
- SPF verified
- DKIM TXT added

SMTP env values expected:
- `ZOHO_SMTP_HOST=smtppro.zoho.eu`
- `ZOHO_SMTP_PORT=465`
- `ZOHO_SMTP_SECURE=true`
- `ZOHO_SMTP_USER=office@marand-print.ro`
- `ZOHO_SMTP_FROM=office@marand-print.ro`

Important:
- Use the EU SMTP host, not `.com`
- If auth still fails, the next suspect is `ZOHO_SMTP_PASS`

## Backend Environment Variables
Expected backend env set on DigitalOcean:

```env
APP_ORIGIN=https://marand-print.ro
MAIL_TO=office@marand-print.ro

ZOHO_SMTP_HOST=smtppro.zoho.eu
ZOHO_SMTP_PORT=465
ZOHO_SMTP_SECURE=true
ZOHO_SMTP_USER=office@marand-print.ro
ZOHO_SMTP_FROM=office@marand-print.ro
ZOHO_SMTP_PASS=...

SPACES_REGION=fra1
SPACES_BUCKET=marand-uploads
SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
SPACES_CDN_BASE_URL=https://marand-uploads.fra1.digitaloceanspaces.com
SPACES_KEY=...
SPACES_SECRET=...

UPLOAD_MAX_FILE_BYTES=262144000
UPLOAD_MAX_TOTAL_BYTES=1073741824
UPLOAD_MAX_FILES=10
```

## Known Code Detail To Revisit
In `backend/forms-api/server.js`, uploads are currently signed with:
- `ContentType`
- `ACL: 'private'`

That may be part of the upload failure if the browser request does not exactly match the signed headers.

It may also be wrong for downstream email links, because `publicUrl` links are generated while objects are signed as private.

This is the first code area to inspect if CORS is correct but uploads still fail.

## Recent Important Deploy Fixes
- Added backend lockfile for App Platform build
- Backend now accepts both trimmed and untrimmed routes
- Custom domains moved from the old app to the new app
- `/api/health` works on the live domain

## Recommended Next Debug Order
1. Confirm backend env uses `smtppro.zoho.eu`
2. Confirm Spaces CORS exactly matches the required headers
3. Test offer submit without file
4. Test one small JPG/PDF upload
5. If upload still fails, inspect `server.js` presign behavior and frontend upload headers

## Notes
- This file is for working memory, not public documentation
- Update it when deployment state changes materially
