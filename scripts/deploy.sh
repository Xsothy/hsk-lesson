#!/usr/bin/env bash
# One-command deploy to the `gsap` server. Run from a dev machine:
#   scripts/deploy.sh [--dry-run] [--ref <git-ref>] [--host <ssh-host>]
# Default ref is origin/main. To roll back, deploy an older ref (see docs/deploy.md).
# Idempotent: running twice at the same ref only repeats harmless steps.
# Never touches nginx or other sites, and never overwrites database/database.sqlite
# (it is untracked; it is only backed up before migrating).
set -euo pipefail

HOST="gsap"
APP_DIR="/var/www/hsk-lesson"
PHP_FPM="php8.4-fpm"
SMOKE_BASE="http://127.0.0.1:8169"
REF="origin/main"
DRY_RUN=0

usage() { sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --ref)     REF="${2:?--ref needs a value}"; shift ;;
    --host)    HOST="${2:?--host needs a value}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

# Reject refs that could break out of the remote command line.
if ! [[ "$REF" =~ ^[A-Za-z0-9._/@^~-]+$ ]]; then
  echo "Refusing odd-looking ref: $REF" >&2; exit 2
fi

# Remote script: reads REF / DRY_RUN etc. from its positional args. Steps are plain
# `run` calls so dry-run prints exactly what a real run would execute.
read -r -d '' REMOTE <<'REMOTE_EOF' || true
set -euo pipefail
APP_DIR="$1"; REF="$2"; DRY_RUN="$3"; PHP_FPM="$4"; SMOKE_BASE="$5"

run() {
  echo "+ $*"
  if [ "$DRY_RUN" = 0 ]; then "$@"; fi
}
step() { echo; echo "== $* =="; }

step "Preflight"
cd "$APP_DIR"
echo "dir:      $(pwd)"
echo "current:  $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD))"
echo "target:   $REF"
if git ls-files --error-unmatch database/database.sqlite >/dev/null 2>&1; then
  echo "ABORT: database/database.sqlite is tracked by git; refusing to reset." >&2; exit 1
fi
test -f .env || { echo "ABORT: .env missing" >&2; exit 1; }

step "Fetch and reset code"
run git fetch --prune origin
run git reset --hard "$REF"

step "Back up SQLite before migrating"
BACKUP_DIR="$APP_DIR/storage/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
run mkdir -p "$BACKUP_DIR"
if [ -f database/database.sqlite ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    run sqlite3 database/database.sqlite ".backup '$BACKUP_DIR/database-$STAMP.sqlite'"
  else
    run cp -p database/database.sqlite "$BACKUP_DIR/database-$STAMP.sqlite"
  fi
  echo "(keeping the 10 newest backups)"
  if [ "$DRY_RUN" = 0 ]; then
    ls -1t "$BACKUP_DIR"/database-*.sqlite 2>/dev/null | tail -n +11 | xargs -r rm -f --
  fi
else
  echo "no database/database.sqlite yet; nothing to back up"
fi

step "Dependencies and database"
run composer install --no-dev --optimize-autoloader --no-interaction
run php artisan migrate --force

step "Caches"
run php artisan config:cache
run php artisan route:cache
run php artisan view:cache

step "Permissions (group www-data)"
run sudo chgrp -R www-data storage bootstrap/cache database
run sudo chmod -R g+rwX storage bootstrap/cache database

step "Reload PHP-FPM"
run sudo systemctl reload "$PHP_FPM"

step "Smoke check ($SMOKE_BASE)"
if [ "$DRY_RUN" != 0 ]; then
  for p in /home /courses /browse /practice /review /words /settings "/char/%E5%AD%A6"; do
    echo "+ curl -fsS -o /dev/null $SMOKE_BASE$p   (expect 200)"
  done
else
  fail=0
  for p in /home /courses /browse /practice /review /words /settings "/char/%E5%AD%A6"; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$SMOKE_BASE$p" || echo 000)"
    if [ "$code" = 200 ]; then echo "ok   $code $p"; else echo "FAIL $code $p" >&2; fail=1; fi
  done
  if [ "$fail" != 0 ]; then
    echo "SMOKE CHECK FAILED. Roll back: scripts/deploy.sh --ref <previous-ref>" >&2; exit 1
  fi
fi

step "Done"
echo "now at: $(git rev-parse --short HEAD)"
REMOTE_EOF

echo "Deploy plan: host=$HOST dir=$APP_DIR ref=$REF dry-run=$DRY_RUN"
ssh "$HOST" bash -s -- "$APP_DIR" "$REF" "$DRY_RUN" "$PHP_FPM" "$SMOKE_BASE" <<<"$REMOTE"
