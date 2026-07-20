# Backup and restore

ServiceFlow recovery requires PostgreSQL data and uploaded files from `FILE_STORAGE_ROOT` (the `backend_storage` volume in the supplied Compose deployment). Back up both at a consistent point in time. Record the application commit, migration state, environment configuration, and encryption-key version with each backup.

## PostgreSQL

Use `pg_dump` in a format supported by your restore process. Protect backup files as sensitive data, encrypt them at rest and in transit, restrict access, and test restoration on an isolated database.

Example logical backup:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > serviceflow.dump
```

Restore only into an empty, isolated target using the matching PostgreSQL tools, then apply migrations for the application version being restored.

## Uploaded files

Snapshot or archive the backend storage volume while writes are paused or using storage-level consistent snapshots. Preserve ownership and permissions. Never commit an upload archive to the repository.

## Restore validation

1. Restore PostgreSQL and files into an isolated environment.
2. Supply the original encryption keys required by the restored records.
3. Run `prisma migrate status` and deploy only migrations belonging to the selected release.
4. Start the applications and verify authentication, organization boundaries, file downloads, booking, invoicing, and background jobs.
5. Rotate credentials if the restoration environment is less trusted than production.

Define retention, geographic storage, deletion, and recovery objectives according to the operator's obligations. A backup that has not been restored successfully in a drill is not a verified backup.
