# webhook-driven-pipeline

Webhook-driven task processing pipeline (mini Zapier-style backend) built with TypeScript, Express, PostgreSQL, and Drizzle ORM.

## Project Idea

A user creates a pipeline that includes:

- Source: a webhook trigger endpoint
- Processing action: transformation applied to incoming payload
- Subscribers: destination URLs that receive the processed payload

When an event arrives, the API stores it as a job and returns immediately. A background worker processes queued jobs and sends results to subscribers with retry logic.

## Architecture

The system has two runtime services:

- API service
- Worker service

And one database service:

- PostgreSQL

### API responsibilities

- Pipeline CRUD endpoints
- Webhook ingestion
- Job and delivery status APIs

### Worker responsibilities

- Poll pending jobs
- Claim jobs (set processing state)
- Apply action logic
- Create and send deliveries
- Retry failed sends (max 3)
- Mark job completed or failed

### Core tables

- pipelines
- subscribers
- jobs
- deliveries

## Processing Actions

Current implemented action types:

- uppercase_text: uppercases one target field (default field is text)
- filter_field: keeps only one field from the payload
- add_timestamp: adds ISO timestamp under configurable key (default processedAt)

## API Documentation

Base URL (local): http://localhost:3000

### Health

- GET /health
- GET /

### Pipelines

- POST /pipelines
- GET /pipelines
- GET /pipelines/:id
- DELETE /pipelines/:id

These endpoints require JWT auth header:

Authorization: Bearer <token>

Example request body for POST /pipelines:

```json
{
	"name": "orders-pipeline",
	"actionType": "uppercase_text",
	"actionConfig": {
		"field": "message"
	},
	"subscribers": [
		"https://example.com/subscriber-a",
		"https://example.com/subscriber-b"
	]
}
```

### Webhook ingestion

Primary endpoint (matches plan):

- POST /webhook/:pipelineId

Additional convenience endpoint:

- POST /webhook/source/:sourcePath

Both endpoints accept a JSON object payload and enqueue a job.

Example webhook payload:

```json
{
	"message": "hello world",
	"userId": "u-123"
}
```

### Job visibility

- GET /jobs
- GET /jobs/:id
- GET /jobs/:id/deliveries

These endpoints require JWT auth header.

### Auth

- POST /auth/login

Example request body:

```json
{
	"username": "admin",
	"password": "admin123"
}
```

Example response:

```json
{
	"accessToken": "<jwt>",
	"tokenType": "Bearer"
}
```

## Delivery Contract

Worker sends POST requests to subscriber URLs with this body:

```json
{
	"jobId": 12,
	"deliveryId": 88,
	"payload": {
		"message": "HELLO WORLD"
	}
}
```

## Run Locally (without Docker)

### 1) Prerequisites

- Node.js 22+
- PostgreSQL running locally

### 2) Configure environment

Create .env with:

```env
DATABASE_URL=postgresql://pipeline_user:pipeline_password@localhost:5432/pipeline_db
PORT=3000
WORKER_POLL_INTERVAL_MS=1500
RATE_LIMIT_PIPELINES_PER_MINUTE=20
RATE_LIMIT_WEBHOOKS_PER_MINUTE=120
WEBHOOK_SIGNING_SECRET=
RATE_LIMIT_AUTH_PER_MINUTE=20
JWT_SECRET=change-this-jwt-secret
JWT_EXPIRES_IN=1h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

If WEBHOOK_SIGNING_SECRET is set, webhook requests must include a valid HMAC signature in header x-webhook-signature with this format:

sha256=<hex_digest>

Digest is computed over the raw JSON body using SHA-256 HMAC.

### 3) Install and migrate

```bash
npm ci
npm run db:generate
npm run db:migrate
```

### 4) Run API and worker

```bash
npm run dev:all
```

Or run separately:

```bash
npm run dev
npm run dev:worker
```

## Docker Setup

Run everything (postgres + migrations + API + worker):

```bash
docker compose up --build
```

Services in compose:

- postgres
- migrate
- api
- worker

API will be available at:

- http://localhost:3000

## CI/CD

GitHub Actions workflow file:

- .github/workflows/ci.yml

Pipeline runs:

- npm ci
- npm run lint
- npm run build

On:

- push to main/master
- pull requests

## Design Decisions

- Async job queue behavior is DB-backed for simplicity and reliability in this scope.
- Worker claim operation uses conditional update to reduce double-processing races.
- Delivery retries are implemented in worker with capped attempts and linear backoff.
- Action execution is isolated in a dedicated service to keep worker logic clean.
- API remains responsive by enqueueing and returning 202 immediately for webhook ingestion.

## Optional Phase Implemented

The optional phase was implemented with three focused hardening features:

- Rate limiting: protects API from burst abuse and accidental overload.
- Webhook signature verification: validates webhook authenticity when a secret is configured.
- JWT authentication: protects pipeline/job management endpoints.

Where applied:

- POST /pipelines uses a write limiter.
- POST /webhook/:pipelineId and POST /webhook/source/:sourcePath use ingress limiter and signature verification.
- POST /auth/login uses auth limiter.
- Pipeline and job management endpoints require Bearer JWT.

Quick signature example (Node.js):

```js
import crypto from 'crypto';

const secret = process.env.WEBHOOK_SIGNING_SECRET;
const rawBody = JSON.stringify({ message: 'hello world' });

const signature = crypto
	.createHmac('sha256', secret)
	.update(rawBody)
	.digest('hex');

console.log(`sha256=${signature}`);
```

## Trade-offs and Next Improvements

- Queue is polling-based (simple, reliable), not yet event-driven.
- No metrics dashboard yet.
- Could add dead-letter handling for repeated delivery failures.