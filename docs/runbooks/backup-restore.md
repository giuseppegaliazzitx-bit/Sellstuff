# Backup / restore

## Local (SQLite)

The database is `data/northstar.db`. Copy the file. Media is `data/media/`.

```bash
python scripts/backup.py --dry-run
python scripts/backup.py
```

## Compose / prod (later)

`infra/backup/backup.sh` runs `pg_dump` plus an object-store sync. The brother’s box should cron it once Compose is live.
