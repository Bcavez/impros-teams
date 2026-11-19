# Takes a full + data-only dump of the production database into ./backups (gitignored).
# Usage (PowerShell, from the repo root):
#   $env:PROD_DB_URL = "<Supabase > Project Settings > Database > Session pooler URI>"
#   .\supabase\scripts\backup-prod.ps1
# Requires pg_dump / pg_restore / psql 17 on PATH (winget install PostgreSQL.PostgreSQL.17).
# The connection string is read from the environment only; it is never written to disk.

$ErrorActionPreference = 'Stop'
if (-not $env:PROD_DB_URL) { throw 'Set $env:PROD_DB_URL first.' }

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
New-Item -ItemType Directory -Force backups | Out-Null

$full = "backups/prod-$stamp-full.dump"
$data = "backups/prod-$stamp-data.sql"
$counts = "backups/prod-$stamp-counts-before.txt"

pg_dump $env:PROD_DB_URL -Fc --no-owner --no-privileges -f $full
pg_dump $env:PROD_DB_URL --data-only -t 'public.*' -t auth.users -t auth.identities -f $data
psql $env:PROD_DB_URL -f supabase/scripts/row-counts.sql -o $counts

# Verify the archive actually contains the data of every existing table.
$toc = pg_restore --list $full
foreach ($t in 'profiles','coaching_sessions','attendance_records','shows','show_assignments','show_availability','users') {
  if (-not ($toc | Select-String -SimpleMatch "TABLE DATA" | Select-String -SimpleMatch " $t ")) {
    throw "Dump verification failed: no TABLE DATA entry for $t"
  }
}

Write-Host "OK: $full, $data, $counts"
Get-Content $counts
