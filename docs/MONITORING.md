# AUTOTEST Monitoring

## Overview

AUTOTEST uses Sentry for:

- FastAPI unhandled exception capture
- FastAPI request error capture
- HTTP performance tracing
- payment worker failure reporting
- payment reconciliation tracing

Sentry is optional. If `SENTRY_DSN` is empty, the application and worker run
normally without external monitoring.

## Configuration

Environment variables:

```env
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_TRACES_SAMPLE_RATE=
```

Recommended production example:

```env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Local development without Sentry

Leave `SENTRY_DSN` empty.

The monitoring module will become a no-op and no events will be sent.

## Production deployment

1. Install dependencies from `requirements.txt`.
2. Set `SENTRY_DSN`.
3. Set `SENTRY_ENVIRONMENT=production`.
4. Set a conservative `SENTRY_TRACES_SAMPLE_RATE`, for example `0.1`.
5. Restart the FastAPI app and the payment worker process.

## Architecture

- FastAPI initializes Sentry during startup.
- FastAPI request errors are captured through the FastAPI integration.
- The payment worker captures:
  - `worker_cycle_failed`
  - `retry_exhausted`
- Payment reconciliation batches are wrapped in tracing spans.

## Running the worker with monitoring

```powershell
.\.venv\Scripts\python.exe scripts\run_payment_worker.py
```

As long as the worker environment includes the Sentry variables, worker events
will be reported automatically.
