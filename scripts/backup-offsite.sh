#!/usr/bin/env bash
#
# Web5.blog — offsite SQLite backup.
#
# Takes a consistent snapshot of the production SQLite database with
# `sqlite3 .backup`, verifies it with PRAGMA integrity_check, compresses it,
# writes a JSON manifest, keeps a pruned local copy and then pushes the
# archive OFF THIS MACHINE through a pluggable command (OFFSITE_UPLOAD_CMD).
#
# The offsite step is mandatory: if it is not configured, or it fails, this
# script exits non-zero. A backup that silently stays on the same disk is the
# failure mode this script exists to remove.
#
# Configuration precedence: exported environment > ENV_FILE > built-in default.
# See docs/BACKUP.md.
#
# Exit codes:
#   0 ok                       5 status log could not be written
#   1 general failure          6 local retention dir not usable
#   2 misconfiguration         7 another instance is already running
#   3 snapshot failed integrity_check
#   4 not enough free disk
#
# Requires: bash 4+, sqlite3, gzip, sha256sum, coreutils, find, df.
# jq is used when present, never required.

set -euo pipefail

readonly PROG=${0##*/}
readonly TOOL_VERSION=1.0.0
readonly MANIFEST_SCHEMA='web5.backup.manifest/1'

ENV_FILE=${ENV_FILE:-/root/ops/backup.env}

DRY_RUN=0
LOCAL_DIR_EXPLICIT=0
DB_OVERRIDE=''
LOCAL_DIR_OVERRIDE=''
WORKDIR=''
LOG_EMITTED=0
LOG_WRITE_FAILED=0
START_EPOCH=$(date +%s)

# ── tiny helpers ───────────────────────────────────────────────────────
info() { printf '[%s] %s\n' "$PROG" "$*" >&2; }
warn() { printf '[%s] WARN: %s\n' "$PROG" "$*" >&2; }

die() { # die <exit-code> <message...>
  local code=$1
  shift
  printf '[%s] ERROR: %s\n' "$PROG" "$*" >&2
  exit "$code"
}

usage() {
  cat <<'USAGE'
Web5.blog offsite SQLite backup

Usage: backup-offsite.sh [options]

  --dry-run          Snapshot + integrity_check + manifest + gzip, then stop.
                     Nothing is uploaded, nothing is pruned. Artifacts are
                     left in a temp directory and the paths are printed.
  --db <path>        Database to back up (default: $DB_PATH).
  --local-dir <dir>  Override the local retention directory.
  -h, --help         Show this help.

Configuration (environment, then ENV_FILE):
  ENV_FILE=/root/ops/backup.env   DB_PATH
  LOCAL_BACKUP_DIR                LOG_FILE
  LOCAL_RETENTION_DAYS=14         MIN_FREE_MB=512
  OFFSITE_UPLOAD_CMD="rclone copy {file} remote:web5-backups/"
  OFFSITE_UPLOAD_TIMEOUT=1800     MANIFEST_TABLES="Prime Eidolon ..."

Exit codes: 0 ok, 1 failure, 2 misconfiguration, 3 integrity, 4 disk,
            5 log write, 6 local dir, 7 already running.
USAGE
}

now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }

json_escape() { # escape a string for embedding in JSON
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\r'/}
  s=${s//$'\n'/ }
  s=${s//$'\t'/ }
  printf '%s' "$s"
}

file_bytes() {
  local f=$1
  if stat -c %s "$f" >/dev/null 2>&1; then
    stat -c %s "$f"
  else
    wc -c <"$f" | tr -d ' '
  fi
}

file_sha256() {
  sha256sum "$1" | cut -d' ' -f1
}

free_mb() { # free megabytes on the filesystem holding $1
  df -Pm "$1" 2>/dev/null | awk 'NR==2 {print $4 + 0}'
}

# ── argument parsing ───────────────────────────────────────────────────
parse_args() {
  while [ $# -gt 0 ]; do
    case $1 in
      --dry-run) DRY_RUN=1 ;;
      --db)
        [ $# -ge 2 ] || die 2 '--db requires a path'
        DB_OVERRIDE=$2
        shift
        ;;
      --local-dir)
        [ $# -ge 2 ] || die 2 '--local-dir requires a path'
        LOCAL_DIR_OVERRIDE=$2
        LOCAL_DIR_EXPLICIT=1
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) die 2 "unknown argument: $1 (try --help)" ;;
    esac
    shift
  done
}

# ── env file ───────────────────────────────────────────────────────────
# Parsed, not sourced: a script running as root should not execute whatever
# happens to sit in a config file. Only KEY=VALUE lines are read, and anything
# already exported in the environment wins over the file.
load_env_file() {
  local f=$1 line key val perms
  if [ ! -f "$f" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then return 0; fi
    die 2 "env file $f not found (set ENV_FILE or create it; see docs/BACKUP.md)"
  fi

  perms=$(stat -c '%a' "$f" 2>/dev/null || echo '')
  case $perms in
    '' | 600 | 400 | 700) ;;
    *) warn "env file $f has mode $perms (expected 600): it holds credentials" ;;
  esac

  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    case $line in
      '' | '#'*) continue ;;
    esac
    case $line in
      *=*) ;;
      *) continue ;;
    esac
    key=${line%%=*}
    val=${line#*=}
    key=${key#"${key%%[![:space:]]*}"}
    key=${key%"${key##*[![:space:]]}"}
    [[ $key =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    val=${val#"${val%%[![:space:]]*}"}
    val=${val%"${val##*[![:space:]]}"}
    case $val in
      \"*\") val=${val#\"} val=${val%\"} ;;
      \'*\') val=${val#\'} val=${val%\'} ;;
    esac
    if [ -z "${!key+x}" ]; then
      export "$key=$val"
    fi
  done <"$f"
}

# ── status log: one JSON line per run, for alerting ────────────────────
emit_log() { # emit_log <status> <detail> <exit-code>
  local status=$1 detail=$2 code=$3 ts dur line dir
  ts=$(now_utc)
  dur=$(($(date +%s) - START_EPOCH))
  line=$(printf '{"ts":"%s","event":"backup","status":"%s","exit_code":%d,"duration_s":%d,"host":"%s","tool":"%s","db":"%s","archive":"%s","bytes":%s,"sha256":"%s","integrity":"%s","rows_total":%s,"tables":%s,"dry_run":%s,"offsite":"%s","detail":"%s"}' \
    "$ts" "$status" "$code" "$dur" \
    "$(json_escape "${HOSTNAME:-$(uname -n)}")" "$TOOL_VERSION" \
    "$(json_escape "${DB_PATH:-}")" "$(json_escape "${ARCHIVE_NAME:-}")" \
    "${ARCHIVE_BYTES:-0}" "${ARCHIVE_SHA256:-}" "${INTEGRITY:-unknown}" \
    "${ROWS_TOTAL:-0}" "${TABLES:-0}" \
    "$([ "$DRY_RUN" -eq 1 ] && echo true || echo false)" \
    "$(json_escape "${OFFSITE_STATUS:-skipped}")" \
    "$(json_escape "$detail")")

  dir=$(dirname "$LOG_FILE")
  if mkdir -p "$dir" 2>/dev/null && printf '%s\n' "$line" >>"$LOG_FILE" 2>/dev/null; then
    LOG_EMITTED=1
  else
    LOG_WRITE_FAILED=1
    printf '%s\n' "$line" >&2
    warn "could not append to $LOG_FILE"
  fi
}

on_exit() {
  local rc=$?
  trap - EXIT
  if [ "$LOG_EMITTED" -eq 0 ] && [ "$rc" -ne 0 ]; then
    emit_log fail 'aborted before completion' "$rc" || true
  fi
  if [ -n "$WORKDIR" ] && [ -d "$WORKDIR" ]; then
    rm -rf "$WORKDIR"
  fi
  if [ "$LOG_WRITE_FAILED" -eq 1 ] && [ "$DRY_RUN" -eq 0 ] && [ "$rc" -eq 0 ]; then
    printf '[%s] ERROR: status log could not be written; alerting is broken\n' "$PROG" >&2
    exit 5
  fi
  exit "$rc"
}

# ── locking ────────────────────────────────────────────────────────────
lock_or_die() {
  local lock=$1
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$lock"
    flock -n 9 || die 7 "another backup is already running (lock: $lock)"
  else
    warn 'flock not available; relying on the timer to avoid overlap'
  fi
}

# ── offsite upload ─────────────────────────────────────────────────────
# OFFSITE_UPLOAD_CMD is a shell command with {file} replaced by the quoted
# local path. Credentials live in the env file or in the tool's own config
# (rclone.conf, ~/.aws, ssh key) and never in this repository.
upload_offsite() {
  local file=$1 quoted cmd
  printf -v quoted '%q' "$file"
  cmd=${OFFSITE_UPLOAD_CMD//\{file\}/$quoted}
  if command -v timeout >/dev/null 2>&1; then
    timeout "$OFFSITE_UPLOAD_TIMEOUT" bash -c "$cmd"
  else
    bash -c "$cmd"
  fi
}

# ── main ───────────────────────────────────────────────────────────────
parse_args "$@"

load_env_file "$ENV_FILE"
if [ ! -f "$ENV_FILE" ]; then
  warn "env file $ENV_FILE not found; using environment and defaults (dry-run)"
fi

# Defaults applied after the env file so the file can override them.
: "${DB_PATH:=/root/web5.blog/prisma/db/custom.db}"
: "${LOCAL_BACKUP_DIR:=/root/web5.blog/backups/offsite}"
: "${LOG_FILE:=/var/log/web5/backup-offsite.log}"
: "${LOCAL_RETENTION_DAYS:=14}"
: "${MIN_FREE_MB:=512}"
: "${OFFSITE_UPLOAD_CMD:=}"
: "${OFFSITE_UPLOAD_TIMEOUT:=1800}"
: "${MANIFEST_TABLES:=Prime Eidolon Vessel VesselSession Content Interaction AP2Budget AutonomousLog AdminLog SystemConfig TaskOrder PayoutLedger BackupWallet ChainDeposit BackupWalletTx AuthNonce ExternalOpportunity}"

if [ -n "$DB_OVERRIDE" ]; then DB_PATH=$DB_OVERRIDE; fi
if [ -n "$LOCAL_DIR_OVERRIDE" ]; then LOCAL_BACKUP_DIR=$LOCAL_DIR_OVERRIDE; fi

# From here on every failure also leaves a JSON line in LOG_FILE.
trap on_exit EXIT

for bin in sqlite3 gzip sha256sum df awk find mktemp; do
  command -v "$bin" >/dev/null 2>&1 || die 2 "required tool missing: $bin"
done

[ -f "$DB_PATH" ] || die 1 "database not found: $DB_PATH"
[ -r "$DB_PATH" ] || die 1 "database not readable: $DB_PATH"
case $DB_PATH in *\'*) die 2 "database path contains a single quote, refusing: $DB_PATH" ;; esac

if [ "$DRY_RUN" -eq 1 ] && [ "$LOCAL_DIR_EXPLICIT" -eq 0 ]; then
  LOCAL_BACKUP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/web5-backup-dryrun.XXXXXX")
  info "dry-run: local artifacts will be left in $LOCAL_BACKUP_DIR"
fi

mkdir -p "$LOCAL_BACKUP_DIR" 2>/dev/null || die 6 "cannot create local backup dir: $LOCAL_BACKUP_DIR"
[ -w "$LOCAL_BACKUP_DIR" ] || die 6 "local backup dir not writable: $LOCAL_BACKUP_DIR"

lock_or_die "$LOCAL_BACKUP_DIR/.backup-offsite.lock"

# Free space: the snapshot is about the size of the database and is gzipped
# afterwards, so check the retention filesystem before we start.
avail=$(free_mb "$LOCAL_BACKUP_DIR")
if [ -z "$avail" ] || [ "$avail" -lt "$MIN_FREE_MB" ]; then
  die 4 "only ${avail:-0}MB free on $LOCAL_BACKUP_DIR, need at least ${MIN_FREE_MB}MB (MIN_FREE_MB)"
fi

WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/web5-backup.XXXXXX")
SNAPSHOT=$WORKDIR/snapshot.db

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BASE_NAME="web5-db-$STAMP"
ARCHIVE_NAME="$BASE_NAME.db.gz"
MANIFEST_NAME="$BASE_NAME.json"
ARCHIVE_TMP=$WORKDIR/$ARCHIVE_NAME
MANIFEST_TMP=$WORKDIR/$MANIFEST_NAME

info "database: $DB_PATH ($(file_bytes "$DB_PATH") bytes)"
info "snapshot: sqlite3 .backup -> $SNAPSHOT"

# Consistent snapshot. `.timeout` lets a concurrent writer finish instead of
# failing the run; `.bail on` makes sqlite3 stop at the first error.
if ! sqlite3 "$DB_PATH" >/dev/null <<SQL
.timeout 30000
.bail on
.backup '$SNAPSHOT'
SQL
then
  die 1 'sqlite3 .backup failed (database busy or unreadable?)'
fi

[ -s "$SNAPSHOT" ] || die 1 "snapshot is empty: $SNAPSHOT"
snapshot_bytes=$(file_bytes "$SNAPSHOT")
info "snapshot written: $snapshot_bytes bytes"

# Integrity of the snapshot itself, not of the live file.
integrity=$(sqlite3 "$SNAPSHOT" 'PRAGMA integrity_check;' | tr -d '\r' | head -1)
INTEGRITY=${integrity:-unknown}
if [ "$INTEGRITY" != 'ok' ]; then
  printf '[%s] ERROR: integrity_check on snapshot failed: %s\n' "$PROG" "$INTEGRITY" >&2
  emit_log fail "integrity_check failed: $INTEGRITY" 3
  exit 3
fi
info 'integrity_check: ok'

sqlite_version=$(sqlite3 "$SNAPSHOT" 'SELECT sqlite_version();' | tr -d '\r' | head -1)

# Row counts for the main tables. Tables that are absent are recorded as null
# so a restore drill can spot schema drift rather than silently passing.
present_tables=$(sqlite3 "$SNAPSHOT" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;" | tr -d '\r')
row_entries=''
ROWS_TOTAL=0
TABLES=0
for table in $MANIFEST_TABLES; do
  case $table in
    *[!A-Za-z0-9_]*) warn "skipping table name with unsafe characters: $table"; continue ;;
  esac
  if printf '%s\n' "$present_tables" | grep -Fxq -- "$table"; then
    count=$(sqlite3 "$SNAPSHOT" "SELECT COUNT(*) FROM \"$table\";" | tr -d '\r[:space:]')
    count=${count:-0}
    ROWS_TOTAL=$((ROWS_TOTAL + count))
    TABLES=$((TABLES + 1))
    row_entries+="${row_entries:+, }\"$table\": $count"
  else
    row_entries+="${row_entries:+, }\"$table\": null"
  fi
done
info "row counts: $TABLES tables present, $ROWS_TOTAL rows total"

# Compress (-n: no mtime/name in the gzip header, so equal input gives equal
# bytes) and hash what we will actually store and ship.
gzip -9 -n -c "$SNAPSHOT" >"$ARCHIVE_TMP"
gzip -t "$ARCHIVE_TMP" || die 1 "gzip self-test failed on $ARCHIVE_TMP"
ARCHIVE_BYTES=$(file_bytes "$ARCHIVE_TMP")
ARCHIVE_SHA256=$(file_sha256 "$ARCHIVE_TMP")
info "archive: $ARCHIVE_NAME ($ARCHIVE_BYTES bytes) sha256=$ARCHIVE_SHA256"

# JSON manifest next to the archive. Built with printf so jq stays optional.
{
  printf '{\n'
  printf '  "schema": "%s",\n' "$MANIFEST_SCHEMA"
  printf '  "created_at": "%s",\n' "$(now_utc)"
  printf '  "host": "%s",\n' "$(json_escape "${HOSTNAME:-$(uname -n)}")"
  printf '  "tool": "%s %s",\n' "$PROG" "$TOOL_VERSION"
  printf '  "db": { "path": "%s", "bytes": %s, "sqlite_version": "%s" },\n' \
    "$(json_escape "$DB_PATH")" "$(file_bytes "$DB_PATH")" "$(json_escape "$sqlite_version")"
  printf '  "snapshot": { "file": "%s", "bytes": %s, "integrity": "%s" },\n' \
    "$BASE_NAME.db" "$snapshot_bytes" "$(json_escape "$INTEGRITY")"
  printf '  "archive": { "file": "%s", "bytes": %s, "sha256": "%s", "compression": "gzip -9 -n" },\n' \
    "$ARCHIVE_NAME" "$ARCHIVE_BYTES" "$ARCHIVE_SHA256"
  printf '  "row_counts": { %s }\n' "$row_entries"
  printf '}\n'
} >"$MANIFEST_TMP"

if command -v jq >/dev/null 2>&1; then
  jq -e . "$MANIFEST_TMP" >/dev/null || die 1 "generated manifest is not valid JSON: $MANIFEST_TMP"
  info 'manifest validated with jq'
fi

# Move both artifacts into the retention directory.
mv -f "$ARCHIVE_TMP" "$LOCAL_BACKUP_DIR/$ARCHIVE_NAME"
mv -f "$MANIFEST_TMP" "$LOCAL_BACKUP_DIR/$MANIFEST_NAME"
info "kept locally: $LOCAL_BACKUP_DIR/$ARCHIVE_NAME"

if [ "$DRY_RUN" -eq 1 ]; then
  OFFSITE_STATUS=skipped
  info 'dry-run: skipping upload and prune'
  emit_log dry_run "dry-run artifacts in $LOCAL_BACKUP_DIR" 0
  info "dry-run archive:  $LOCAL_BACKUP_DIR/$ARCHIVE_NAME"
  info "dry-run manifest: $LOCAL_BACKUP_DIR/$MANIFEST_NAME"
  exit 0
fi

# ── offsite: mandatory ─────────────────────────────────────────────────
if [ -z "${OFFSITE_UPLOAD_CMD// /}" ]; then
  printf '[%s] ERROR: OFFSITE_UPLOAD_CMD is not configured.\n' "$PROG" >&2
  printf '[%s]        The archive at %s has NOT left this machine.\n' "$PROG" "$LOCAL_BACKUP_DIR/$ARCHIVE_NAME" >&2
  printf '[%s]        Set OFFSITE_UPLOAD_CMD in %s (see docs/BACKUP.md).\n' "$PROG" "$ENV_FILE" >&2
  OFFSITE_STATUS=not-configured
  emit_log fail 'OFFSITE_UPLOAD_CMD not configured; backup stayed local' 2
  exit 2
fi

OFFSITE_STATUS=failed
info "uploading $ARCHIVE_NAME offsite"
if ! upload_offsite "$LOCAL_BACKUP_DIR/$ARCHIVE_NAME"; then
  printf '[%s] ERROR: offsite upload of %s FAILED.\n' "$PROG" "$ARCHIVE_NAME" >&2
  emit_log fail "offsite upload failed: $ARCHIVE_NAME" 1
  exit 1
fi

info "uploading $MANIFEST_NAME offsite"
if ! upload_offsite "$LOCAL_BACKUP_DIR/$MANIFEST_NAME"; then
  printf '[%s] ERROR: offsite upload of %s FAILED.\n' "$PROG" "$MANIFEST_NAME" >&2
  emit_log fail "offsite upload failed: $MANIFEST_NAME" 1
  exit 1
fi

OFFSITE_STATUS=ok
info 'offsite upload complete'

# ── local retention ────────────────────────────────────────────────────
pruned=0
while IFS= read -r old; do
  [ -n "$old" ] || continue
  rm -f "$old"
  pruned=$((pruned + 1))
  info "pruned: $(basename "$old")"
done < <(find "$LOCAL_BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'web5-db-*.db.gz' -o -name 'web5-db-*.json' \) \
  -mtime +"$LOCAL_RETENTION_DAYS" -print 2>/dev/null)

info "prune: removed $pruned file(s) older than ${LOCAL_RETENTION_DAYS}d"

emit_log ok "offsite upload ok; pruned=$pruned" 0
info "done: $ARCHIVE_NAME ($ARCHIVE_BYTES bytes) is stored offsite"
