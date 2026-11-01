#!/usr/bin/env bash
#
# Web5.blog — backup verification (restore drill in a can).
#
# Fetches the newest offsite archive and its manifest, then restores the
# archive into a temp directory and proves it is usable:
#
#   sha256 of the archive == manifest        (transfer was not corrupted)
#   gzip -t                                  (container is intact)
#   PRAGMA integrity_check == ok             (SQLite pages are consistent)
#   row counts == manifest row_counts        (it is the data we think it is)
#
# Prints PASS/FAIL per check and a final verdict. Exit 0 = PASS, 1 = FAIL,
# 2 = usage/configuration error.
#
# Usage:
#   verify-backup.sh --offsite                       # newest archive offsite
#   verify-backup.sh --manifest <f.json> [--snapshot <f.db.gz>]
#   verify-backup.sh --offsite --keep                # keep the restore dir
#
# Configuration (environment, then ENV_FILE):
#   OFFSITE_LIST_CMD   prints one object name per line, newest need not be last
#   OFFSITE_FETCH_CMD  downloads; {file} = remote name, {dest} = local path
#                      e.g. rclone copy "remote:web5-backups/{file}" {dest}
#
# Requires: bash 4+, sqlite3, gzip, sha256sum, find, sort, tail.
# jq is used when present, never required.

set -euo pipefail

readonly PROG=${0##*/}
readonly TOOL_VERSION=1.0.0

ENV_FILE=${ENV_FILE:-/root/ops/backup.env}

MODE=''
MANIFEST=''
SNAPSHOT=''
KEEP=0
WORKDIR=''
FETCH_TIMEOUT=${OFFSITE_UPLOAD_TIMEOUT:-1800}

CHECKS=0
FAILURES=0

info() { printf '[%s] %s\n' "$PROG" "$*" >&2; }
warn() { printf '[%s] WARN: %s\n' "$PROG" "$*" >&2; }

die() {
  local code=$1
  shift
  printf '[%s] ERROR: %s\n' "$PROG" "$*" >&2
  exit "$code"
}

usage() {
  cat <<'USAGE'
Web5.blog backup verification / restore drill

Usage: verify-backup.sh [options]

  --offsite            Verify the newest archive from the offsite target.
  --manifest <path>    Verify a local manifest (dev/test, or a manual drill).
  --snapshot <path>    Local archive; defaults to the manifest's archive name
                       in the same directory, or is fetched when --offsite.
  --keep               Keep the temp restore directory (for inspection).
  -h, --help           Show this help.

Offsite mode requires OFFSITE_LIST_CMD and OFFSITE_FETCH_CMD (see docs/BACKUP.md).
Exit: 0 PASS, 1 FAIL, 2 usage or configuration error.
USAGE
}

have_jq() { command -v jq >/dev/null 2>&1; }

now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }

file_bytes() {
  if stat -c %s "$1" >/dev/null 2>&1; then stat -c %s "$1"; else wc -c <"$1" | tr -d ' '; fi
}

file_sha256() { sha256sum "$1" | cut -d' ' -f1; }

# ── manifest access without requiring jq ───────────────────────────────
m_valid() { # 0 when the file is parseable JSON we understand
  local f=$1
  if have_jq; then
    jq -e '.schema and .archive and .row_counts' "$f" >/dev/null 2>&1
  else
    grep -q '"schema"' "$f" && grep -q '"archive"' "$f" && grep -q '"row_counts"' "$f"
  fi
}

m_archive_sha() {
  if have_jq; then
    jq -r '.archive.sha256 // empty' "$1"
  else
    sed -n 's/.*"sha256": *"\([0-9A-Fa-f]\{64\}\)".*/\1/p' "$1" | head -1
  fi
}

m_archive_bytes() {
  if have_jq; then
    jq -r '.archive.bytes // empty' "$1"
  else
    sed -n 's/.*"archive":.*"bytes": *\([0-9][0-9]*\).*/\1/p' "$1" | head -1
  fi
}

m_archive_file() {
  if have_jq; then
    jq -r '.archive.file // empty' "$1"
  else
    sed -n 's/.*"archive":.*"file": *"\([^"]*\)".*/\1/p' "$1" | head -1
  fi
}

m_row_counts() { # prints "<table> <count>" lines, null counts omitted
  if have_jq; then
    jq -r '.row_counts | to_entries[] | select(.value != null) | "\(.key) \(.value)"' "$1"
  else
    sed -n 's/.*"row_counts": *{\(.*\)}.*/\1/p' "$1" |
      tr ',' '\n' |
      sed -n 's/^ *"\([A-Za-z0-9_]*\)": *\([0-9][0-9]*\) *$/\1 \2/p'
  fi
}

# ── check reporter ─────────────────────────────────────────────────────
check() { # check <label> <pass|fail> <detail>
  local label=$1 state=$2 detail=${3:-}
  CHECKS=$((CHECKS + 1))
  if [ "$state" = pass ]; then
    printf '%-46s PASS  %s\n' "$label" "$detail"
  else
    printf '%-46s FAIL  %s\n' "$label" "$detail"
    FAILURES=$((FAILURES + 1))
  fi
}

# ── env file (parsed, never sourced) ───────────────────────────────────
load_env_file() {
  local f=$1 line key val
  [ -f "$f" ] || return 1
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    case $line in '' | '#'*) continue ;; esac
    case $line in *=*) ;; *) continue ;; esac
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
    [ -z "${!key+x}" ] && export "$key=$val"
  done <"$f"
  return 0
}

# ── arg parsing ────────────────────────────────────────────────────────
parse_args() {
  while [ $# -gt 0 ]; do
    case $1 in
      --offsite) MODE=offsite ;;
      --manifest)
        [ $# -ge 2 ] || die 2 '--manifest requires a path'
        MANIFEST=$2
        MODE=${MODE:-local}
        shift
        ;;
      --snapshot)
        [ $# -ge 2 ] || die 2 '--snapshot requires a path'
        SNAPSHOT=$2
        shift
        ;;
      --keep) KEEP=1 ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) die 2 "unknown argument: $1 (try --help)" ;;
    esac
    shift
  done
  [ -n "$MODE" ] || die 2 'nothing to verify: use --offsite or --manifest <path>'
}

cleanup() {
  local rc=$?
  trap - EXIT
  if [ "$KEEP" -eq 0 ] && [ -n "$WORKDIR" ] && [ -d "$WORKDIR" ]; then
    rm -rf "$WORKDIR"
  fi
  exit "$rc"
}

# ── artifact resolution ────────────────────────────────────────────────
run_offsite_cmd() { # run_offsite_cmd <cmd> [with timeout]
  local cmd=$1
  if command -v timeout >/dev/null 2>&1; then
    timeout "$FETCH_TIMEOUT" bash -c "$cmd"
  else
    bash -c "$cmd"
  fi
}

resolve_offsite() {
  local list_cmd=${OFFSITE_LIST_CMD:-} fetch_cmd=${OFFSITE_FETCH_CMD:-} names newest base
  [ -n "${list_cmd// /}" ] || die 2 'OFFSITE_LIST_CMD is not configured (see docs/BACKUP.md)'
  [ -n "${fetch_cmd// /}" ] || die 2 'OFFSITE_FETCH_CMD is not configured (see docs/BACKUP.md)'

  info 'listing offsite archives'
  names=$(run_offsite_cmd "$list_cmd") || die 1 'OFFSITE_LIST_CMD failed'
  newest=$(printf '%s\n' "$names" | sed 's/\r$//' | grep -E '\.db\.gz$' | sort | tail -1 || true)
  [ -n "$newest" ] || die 1 'no *.db.gz objects found offsite; is the timer running?'

  base=${newest%.db.gz}
  MANIFEST=$WORKDIR/$(basename "$base").json
  SNAPSHOT=$WORKDIR/$(basename "$newest")

  local qf qd cmd
  printf -v qf '%q' "$newest"
  printf -v qd '%q' "$SNAPSHOT"
  cmd=${fetch_cmd//\{file\}/$qf}
  cmd=${cmd//\{dest\}/$qd}
  info "fetching $newest"
  run_offsite_cmd "$cmd" || die 1 "OFFSITE_FETCH_CMD failed for $newest"

  local manifest_remote="$base.json"
  printf -v qf '%q' "$manifest_remote"
  printf -v qd '%q' "$MANIFEST"
  cmd=${fetch_cmd//\{file\}/$qf}
  cmd=${cmd//\{dest\}/$qd}
  info "fetching $manifest_remote"
  run_offsite_cmd "$cmd" || die 1 "OFFSITE_FETCH_CMD failed for $manifest_remote"
}

resolve_local() {
  [ -f "$MANIFEST" ] || die 2 "manifest not found: $MANIFEST"
  if [ -z "$SNAPSHOT" ]; then
    local name
    name=$(m_archive_file "$MANIFEST" || true)
    [ -n "$name" ] || die 2 "cannot read archive name from $MANIFEST"
    SNAPSHOT="$(dirname "$MANIFEST")/$name"
  fi
}

# ── checks ─────────────────────────────────────────────────────────────
finish() {
  echo
  if [ "$FAILURES" -eq 0 ]; then
    printf 'RESULT: PASS (%d checks, %s)\n' "$CHECKS" "$(basename "$SNAPSHOT")"
    return 0
  fi
  printf 'RESULT: FAIL (%d of %d checks failed)\n' "$FAILURES" "$CHECKS"
  return 1
}

verify() {
  local expect_sha expect_bytes actual_sha actual_bytes integrity db rows_checked mismatches
  local table count actual

  printf '\nverifying: %s\n' "$SNAPSHOT"
  printf 'manifest:  %s\n' "$MANIFEST"
  printf 'started:   %s\n\n' "$(now_utc)"

  if m_valid "$MANIFEST"; then
    check 'manifest is readable JSON' pass "$(basename "$MANIFEST")"
  else
    check 'manifest is readable JSON' fail 'cannot parse manifest'
    if ! finish; then return 1; fi
    return 0
  fi

  if [ -s "$SNAPSHOT" ]; then
    check 'archive exists and is non-empty' pass "$(file_bytes "$SNAPSHOT") bytes"
  else
    check 'archive exists and is non-empty' fail "$SNAPSHOT"
    if ! finish; then return 1; fi
    return 0
  fi

  expect_bytes=$(m_archive_bytes "$MANIFEST" || true)
  actual_bytes=$(file_bytes "$SNAPSHOT")
  if [ -n "$expect_bytes" ] && [ "$expect_bytes" = "$actual_bytes" ]; then
    check 'archive size matches manifest' pass "$actual_bytes bytes"
  else
    check 'archive size matches manifest' fail "expected ${expect_bytes:-?}, got $actual_bytes"
  fi

  expect_sha=$(m_archive_sha "$MANIFEST" || true)
  actual_sha=$(file_sha256 "$SNAPSHOT")
  if [ -n "$expect_sha" ] && [ "$expect_sha" = "$actual_sha" ]; then
    check 'archive sha256 matches manifest' pass "$actual_sha"
  else
    check 'archive sha256 matches manifest' fail "expected ${expect_sha:-?}, got $actual_sha"
  fi

  if gzip -t "$SNAPSHOT" 2>/dev/null; then
    check 'gzip container is intact' pass 'gzip -t'
  else
    check 'gzip container is intact' fail 'gzip -t reported corruption'
    if ! finish; then return 1; fi
    return 0
  fi

  db=$WORKDIR/restored.db
  rm -f "$db"
  if ! gzip -dc "$SNAPSHOT" >"$db" 2>/dev/null; then
    check 'archive unpacks' fail 'gunzip failed'
    if ! finish; then return 1; fi
    return 0
  fi
  check 'archive unpacks' pass "$(file_bytes "$db") bytes uncompressed"

  integrity=$(sqlite3 "$db" 'PRAGMA integrity_check;' | tr -d '\r' | head -1)
  if [ "${integrity:-}" = 'ok' ]; then
    check 'PRAGMA integrity_check' pass 'ok'
  else
    check 'PRAGMA integrity_check' fail "${integrity:-no output}"
    if ! finish; then return 1; fi
    return 0
  fi

  rows_checked=0
  mismatches=0
  while read -r table count; do
    [ -n "${table:-}" ] || continue
    case $table in
      *[!A-Za-z0-9_]*) continue ;;
    esac
    actual=$(sqlite3 "$db" "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d '\r[:space:]' || true)
    rows_checked=$((rows_checked + 1))
    if [ "${actual:-x}" != "$count" ]; then
      mismatches=$((mismatches + 1))
      check "row count: $table" fail "manifest $count, restored ${actual:-error}"
    fi
  done < <(m_row_counts "$MANIFEST")

  if [ "$rows_checked" -eq 0 ]; then
    check 'row counts compared' fail 'manifest has no row counts to compare'
  elif [ "$mismatches" -eq 0 ]; then
    check 'row counts match manifest' pass "$rows_checked tables"
  else
    check 'row counts match manifest' fail "$mismatches of $rows_checked tables differ"
  fi

  finish
}

# ── main ───────────────────────────────────────────────────────────────
parse_args "$@"
load_env_file "$ENV_FILE" || warn "env file $ENV_FILE not found; using current environment"

for bin in sqlite3 gzip sha256sum; do
  command -v "$bin" >/dev/null 2>&1 || die 2 "required tool missing: $bin"
done

WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/web5-verify.XXXXXX")
trap cleanup EXIT

if [ "$MODE" = offsite ]; then
  resolve_offsite
else
  resolve_local
fi

if [ "$KEEP" -eq 1 ]; then
  info "restore dir kept: $WORKDIR"
fi

rc=0
verify || rc=1
exit "$rc"
