# Marand Forms API

Small backend service for:

- presigned file uploads to DigitalOcean Spaces
- sending offer requests through Zoho SMTP

## Endpoints

- `GET /health`
- `POST /api/uploads/presign`
- `POST /api/oferta`

## Expected App Platform setup

Use two components:

1. static site component for the frontend
2. web service component for this backend

Route `/api` requests to the backend service.

## Environment

Copy `.env.example` and fill in:

- Zoho SMTP credentials
- Spaces credentials
- app origin

## Run locally

```bash
cd backend/forms-api
npm install
npm start
```
