# TekCert runbook

What to watch, what to do when something breaks, and how to get the data back. Written for the
pilot, before staging exists on AWS (S08). Commands run from `app/`.

## What to watch

| Check | Where | Healthy answer |
|---|---|---|
| Is the whole app up? | `GET /status` on the web app | `200` and `{"status":"ok","web":"ok","api":"ok","database":"ok"}` |
| Is a web server up? (load balancer) | `GET /healthz` on the web app | `200`. It never calls the API, so a slow API doesn't get web servers replaced |
| Is an API server up? (load balancer) | `GET /health` on the API | `200`, with the database check `up` |
| Errors | Sentry, when `SENTRY_DSN` is set on both tiers | No new issue after a release |
| Logs | The API's JSON logs (pino) | Every error line has a `requestId`, the same one the student's browser received |

Point an uptime service (UptimeRobot, Better Stack, or a CloudWatch Synthetics canary on AWS) at
`/status` every minute, and alert after two failures in a row. `503` means one tier is down: the
body says which.

## When something breaks

1. **Open `/status`.** It names the tier that is down.
2. **API down or slow:** read its logs; a database outage shows as `database: down`. Restart the
   API. Nothing is lost: every write is in Postgres, and a tick in flight is retried by the
   browser (`keepalive`).
3. **Database down:** restart it (`docker compose restart db` locally). If the data is damaged,
   restore the last backup (below).
4. **A student reports an error:** ask for the code on the error screen (`ERR_HTTP_500`, …) and the
   time; search the logs for that minute, then follow the `requestId`. The same id is a tag on the
   Sentry issue.
5. **Emails don't arrive:** check `SMTP_URL`. A failed notification email is logged and not retried;
   the notification is still in the app.

## Backups

Locally and on any machine where Postgres runs in Docker:

```bash
pnpm db:backup                                   # writes backups/tekcert-<date>.dump
pnpm db:backup -- --db tekcert_test              # another database
pnpm db:restore -- backups/<file>.dump --into tekcert   # replaces that database's content
pnpm db:backup:check                             # dump, restore into a scratch database, compare
```

`backups/` is git-ignored: dumps hold personal data. Keep them on encrypted storage, and delete
them when they are no longer needed.

Run `pnpm db:backup:check` after any change to the schema: it proves a backup still restores, by
comparing the rows of every table.

### On AWS (when staging is built)

Use the managed backups of RDS rather than these scripts:

- automated backups kept **7 days**, with point-in-time restore;
- a manual snapshot before every migration that changes or drops a column;
- restore into a **new** instance, check it, then point the API at it (`DATABASE_URL`);
- the database encrypted at rest, and snapshots never shared outside the account.

## Scheduled jobs

Both run inside the API (`@nestjs/schedule`, Tunis time). Running twice, or on two servers, is
harmless.

| Job | When | What |
|---|---|---|
| Weekly leaderboard notification | Mondays 08:00 | Tells students whose rank moved (ADR-023) |
| Clean-up | Every night 03:30 | Deletes expired sessions and email links (7 days after expiry), sign-in counters untouched for 30 days, notifications older than 90 days. Never the points ledger |

## Demo data

`pnpm db:seed:pilot` fills a database with about 60 invented students (ADR-024). It refuses to run
when `NODE_ENV=production`. Set `PILOT_DEMO_PASSWORD` to sign in as `pilot.demo@tek-up.de`;
without it no pilot account can sign in. Running it again replaces the invented class only.
