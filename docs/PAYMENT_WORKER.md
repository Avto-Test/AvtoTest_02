# AUTOTEST Payment Worker

## Architecture

The payment reconciliation loop no longer belongs to the FastAPI web process.

- Web app responsibilities:
  - create checkout sessions
  - receive webhooks
  - expose payment status endpoints
- Worker responsibilities:
  - scan pending payment rows
  - reconcile provider status
  - retry transient reconciliation failures
  - write structured reconciliation logs

Core implementation files:

- `services/payments/payment_worker.py`
- `scripts/run_payment_worker.py`

## Retry behavior

- `max_retries = 5`
- retry delay uses exponential backoff
- retry state is stored in `payments.raw_payload._payment_worker`
- exhausted retries move the payment into `reconciliation_failed`

## Local run

```powershell
.\.venv\Scripts\python.exe scripts\run_payment_worker.py --poll-interval-seconds 60
```

Optional tuning:

```powershell
.\.venv\Scripts\python.exe scripts\run_payment_worker.py `
  --poll-interval-seconds 30 `
  --batch-size 25 `
  --max-retries 5 `
  --base-retry-delay-seconds 30
```

## Server deployment

Run the worker as a separate long-lived process under a supervisor such as:

- `systemd`
- `supervisord`
- Docker sidecar/container

Recommended command:

```bash
./.venv/bin/python scripts/run_payment_worker.py --poll-interval-seconds 60
```

## Safety notes

- Do not start the payment worker inside FastAPI startup hooks.
- Run only one payment worker per environment unless you add explicit locking.
- Keep provider credentials and database connectivity configured in the worker environment.
