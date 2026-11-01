# Backups and restore — Web5.blog

Operational runbook for the SQLite database. Audience: whoever is on call when
the VPS is unreachable. Everything here is copy-pasteable on Debian 12.

---

## 1. What is backed up, and why

| Thing | Where | Backed up? |
|---|---|---|
| All application data (Primes, Eidolons, Vessels, Content, Interactions, AP2 budgets, TaskOrders, PayoutLedger, chain deposits…) | SQLite `/root/web5.blog/prisma/db/custom.db` | **Yes** — this is the only stateful store |
| Secrets (`DATABASE_URL`, payment keys, Telegram token) | `/root/web5.blog/.env` | No — recreate from the password manager |
| Uploaded media / public assets | `/root/web5.blog/public/`, `/root/web5.blog/upload/` | No — see §8 |
| Code | git (`origin`) + the deployed `.next/standalone` build | No — rebuild from a commit |

SQLite is a single file, which is the whole problem: it lives on the same disk
as the app and the same machine as everything else. The 2026-11-01 outage
made that concrete — for several hours the only copy of the database was on a
host nobody could reach. The 03:20 cron job at `/root/ops/backup-web5.sh`
still exists and is still useful (fast local restore of yesterday), but
`sqlite3 .backup` into `/root/web5.blog/backups/` is **not** a backup: same
disk, same VM, same failure domain.

`scripts/backup-offsite.sh` adds the missing half: a verified copy that is
pushed to a different provider, plus a manifest that lets a restore be
checked mechanically instead of by eyeball.

## 2. How a run works

```
sqlite3 .backup  →  PRAGMA integrity_check  →  gzip -9n  →  sha256
      ↓                                                          ↓
 JSON manifest (timestamp, bytes, sha256, row counts)      local retention dir
                                                                 ↓
                              OFFSITE_UPLOAD_CMD (rclone / aws s3 / scp)
                                                                 ↓
                                        one JSON status line → /var/log/web5/backup-offsite.log
```

The snapshot is taken with `.backup`, never `cp`: copying a live SQLite file
captures a torn page set. `.timeout 30000` and `.bail on` mean a busy database
makes the run fail cleanly instead of producing a half-copied file.

Hard rules the script enforces:

- **No silent local-only success.** `OFFSITE_UPLOAD_CMD` unset → exit 2.
  Upload fails → exit 1. The local archive is kept either way, but the unit
  shows as failed and the log line says `"status":"fail"`.
- **No unverified snapshot.** `PRAGMA integrity_check` must return `ok` on the
  snapshot or the run aborts (exit 3) and nothing is uploaded.
- **No disk exhaustion.** Refuses to run below `MIN_FREE_MB` (exit 4).
- **No overlap.** `flock` on `<local dir>/.backup-offsite.lock` (exit 7).

## 3. Files, names, retention

```
/root/web5.blog/backups/offsite/
  web5-db-20261102T034012Z.db.gz     # the snapshot
  web5-db-20261102T034012Z.json      # its manifest
```

- `LOCAL_RETENTION_DAYS` (default **14**): local files older than this are
  pruned at the end of a successful run. Offsite retention is whatever the
  remote policy is — set it to 30–90 days (see §4); the local copy exists for
  fast recovery, not for history.
- Manifest schema `web5.backup.manifest/1`:

```json
{
  "schema": "web5.backup.manifest/1",
  "created_at": "2026-11-02T03:40:12Z",
  "host": "…",
  "tool": "backup-offsite.sh 1.0.0",
  "db":       { "path": "…", "bytes": 815104, "sqlite_version": "3.40.1" },
  "snapshot": { "file": "web5-db-…Z.db", "bytes": 815104, "integrity": "ok" },
  "archive":  { "file": "web5-db-…Z.db.gz", "bytes": 210944, "sha256": "…", "compression": "gzip -9 -n" },
  "row_counts": { "Prime": 12, "Content": 214, "PayoutLedger": 0, "…": null }
}
```

`null` means the table was absent at snapshot time — that is the signal that
the schema moved, not an error.

## 4. Choosing the offsite target

All three work with the same script; only `OFFSITE_UPLOAD_CMD` changes.

| Target | What it requires | Cost / ops | Tradeoffs |
|---|---|---|---|
| **S3-compatible object storage** (AWS S3, Cloudflare R2, Backblaze B2, Hetzner, Wasabi) — `aws s3 cp` / `rclone copy` | Bucket + access key/secret + region/endpoint. Lifecycle rule for expiry. Versioning is worth enabling (protects against ransomware/accidental overwrite). | Cents per month for <1 GB. Cheapest to run. | Bucket credentials on the VPS are a standing risk; scope the key to one prefix. Same-provider-as-VPS is a risk if you use the same vendor's compute — pick a different provider than the VPS. |
| **rclone to another provider** (B2, R2, Google Drive, Storj, a second S3) — `rclone copy {file} remote:web5-backups/` | `rclone config` on the VPS (writes `/root/.config/rclone/rclone.conf`, mode 600), remote named, bucket/path created. `rclone lsf` for the verify script. | Free tool, provider storage cost only. | One more binary + config to maintain; rclone.conf is a credential file that must not be committed. Most flexible — can also mirror to two remotes. |
| **Second VPS over ssh + rsync/scp** — `scp {file} backup@<host>:/srv/web5-backups/` | A second host, an SSH key for root@web5 → backup@host (`ssh-keygen`, `authorized_keys`, `command=`/chroot optional), and a cron there for its own retention. | Cost of a second VPS (or an existing one). | You own the retention and the disk monitoring on both ends; no built-in encryption at rest. Best when you already pay for a second host, and it is the only option where you control the whole chain. |

Whichever you pick: **use a different provider than the VPS host**, and keep
the credentials readable only by root.

Worked examples (placeholders — real values live in `backup.env` only):

```bash
# S3-compatible, via rclone (recommended: one tool, list+fetch come free)
OFFSITE_UPLOAD_CMD='rclone copy {file} remote:web5-backups/'
OFFSITE_LIST_CMD='rclone lsf --files-only remote:web5-backups/'
# copyto, not copy: {dest} is the full target file path, and `rclone copy`
# would treat it as a directory and nest the file one level down.
OFFSITE_FETCH_CMD='rclone copyto "remote:web5-backups/{file}" {dest}'

# AWS CLI
OFFSITE_UPLOAD_CMD='aws s3 cp {file} s3://<your-bucket>/web5-backups/ --only-show-errors'
OFFSITE_LIST_CMD='aws s3 ls s3://<your-bucket>/web5-backups/ | awk "{print \$4}"'
OFFSITE_FETCH_CMD='aws s3 cp "s3://<your-bucket>/web5-backups/{file}" {dest} --only-show-errors'

# second VPS over ssh
OFFSITE_UPLOAD_CMD='scp -q {file} backup@<host>:/srv/web5-backups/'
OFFSITE_LIST_CMD='ssh backup@<host> ls -1 /srv/web5-backups/'
OFFSITE_FETCH_CMD='scp -q "backup@<host>:/srv/web5-backups/{file}" {dest}'
```

## 5. Install on the VPS

```bash
# 1. scripts (root-owned, not world-readable)
install -d -m 700 /root/ops
install -m 700 /root/web5.blog/scripts/backup-offsite.sh /root/ops/backup-offsite.sh
install -m 700 /root/web5.blog/scripts/verify-backup.sh  /root/ops/verify-backup.sh

# 2. config: secrets stay here, never in the repo
install -m 600 /dev/null /root/ops/backup.env
$EDITOR /root/ops/backup.env        # see §5.1
chmod 600 /root/ops/backup.env

# 3. log dir
install -d -m 755 /var/log/web5

# 4. dry run first: snapshot + integrity + manifest, no upload, no prune
/root/ops/backup-offsite.sh --dry-run

# 5. real run, once, by hand
/root/ops/backup-offsite.sh; echo "exit=$?"

# 6. units
install -m 644 /root/web5.blog/ops/web5-backup-offsite.service /etc/systemd/system/
install -m 644 /root/web5.blog/ops/web5-backup-offsite.timer   /etc/systemd/system/
systemd-analyze verify /etc/systemd/system/web5-backup-offsite.service
systemctl daemon-reload
systemctl enable --now web5-backup-offsite.timer

# 7. confirm
systemctl list-timers web5-backup-offsite.timer
systemctl start web5-backup-offsite.service && systemctl status web5-backup-offsite.service
tail -n 3 /var/log/web5/backup-offsite.log
/root/ops/verify-backup.sh --offsite          # must print RESULT: PASS
```

### 5.1 `/root/ops/backup.env` (mode 600)

```bash
# Offsite transport — required. Without it the script exits 2.
OFFSITE_UPLOAD_CMD='rclone copy {file} remote:web5-backups/'
# Used by scripts/verify-backup.sh; {dest} is a file path, so use copyto.
OFFSITE_LIST_CMD='rclone lsf --files-only remote:web5-backups/'
OFFSITE_FETCH_CMD='rclone copyto "remote:web5-backups/{file}" {dest}'

# Optional overrides (defaults shown)
#DB_PATH=/root/web5.blog/prisma/db/custom.db
#LOCAL_BACKUP_DIR=/root/web5.blog/backups/offsite
#LOCAL_RETENTION_DAYS=14
#LOG_FILE=/var/log/web5/backup-offsite.log
#MIN_FREE_MB=512
#OFFSITE_UPLOAD_TIMEOUT=1800
```

The file is parsed, not sourced: `KEY=VALUE` lines, `#` comments, optional
quotes. Environment variables already exported win over the file. Credentials
belong in `rclone.conf` / `~/.aws` / an ssh key — **not** in this file and
never in the repository.

## 6. Restore drill

Run this quarterly and after any incident. It takes ~10 minutes on a small
database; it is the only proof the backup exists.

```bash
# 1. fetch the newest archive + manifest and verify it, keeping the download
ssh root@<vps>
/root/ops/verify-backup.sh --offsite --keep    # prints the restore dir and RESULT
# → every check below is what that script already asserts; do them by hand only
#   when you want to see the numbers yourself.
DIR=<the "restore dir kept: …" path it printed>
NEWEST=$(ls "$DIR"/*.db.gz)
MANIFEST=$(ls "$DIR"/*.json)

# 2. checksum + integrity before touching anything
sha256sum "$NEWEST"                      # compare with the manifest's archive.sha256
gunzip -c "$NEWEST" > /tmp/restore.db
sqlite3 /tmp/restore.db 'PRAGMA integrity_check;'     # must print exactly: ok
sqlite3 /tmp/restore.db 'SELECT COUNT(*) FROM Content;'
sqlite3 /tmp/restore.db 'SELECT COUNT(*) FROM PayoutLedger;'
# compare both with the manifest's row_counts

# 3. stop the app, keep the current file
systemctl stop web5.service    # or: pm2 stop web5
cp -a /root/web5.blog/prisma/db/custom.db /root/web5.blog/prisma/db/custom.db.before-restore

# 4. swap in the restored file (same owner/mode as the original)
install -o root -g root -m 644 /tmp/restore.db /root/web5.blog/prisma/db/custom.db

# 5. start and verify five endpoints
systemctl start web5.service
for u in \
  https://web5.blog/ \
  https://web5.blog/api/daemon/health \
  'https://web5.blog/api/content/list?limit=5' \
  https://web5.blog/sitemap.xml \
  https://web5.blog/tokenlist.json ; do
  printf '%s -> %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "$u")"
done
curl -s https://web5.blog/api/daemon/health | grep -o '"status":"[A-Z]*"'
```

Expected: all five return `200`, and `/api/daemon/health` reports
`"status":"HEALTHY"` (it runs `SELECT 1` against the database, so it fails if
the swap went wrong). Then log in, open one article, and confirm its content
and an interaction counter look right — row counts prove data volume, not
data correctness.

Rollback if anything looks wrong:

```bash
systemctl stop web5.service
mv /root/web5.blog/prisma/db/custom.db.before-restore /root/web5.blog/prisma/db/custom.db
systemctl start web5.service
```

## 7. Verification and alerting

`scripts/verify-backup.sh` is the credibility check: it fetches the newest
**offsite** archive, compares sha256 and byte count against the manifest,
`gzip -t`, unpacks into a temp dir, runs `PRAGMA integrity_check` and compares
every row count in the manifest. One line out:

```
RESULT: PASS (8 checks, web5-db-20261102T034012Z.db.gz)
RESULT: FAIL (2 of 9 checks failed)
```

Exit 0 = PASS, 1 = FAIL, 2 = usage/config error. Use `--manifest`/`--snapshot`
to check a local pair, `--keep` to keep the restore directory.

**Alerting.** `OnFailure=` is left commented out in the unit because it needs a
unit that actually exists on the host — inventing one that silently does
nothing is worse than no line at all. Two ways to wire it:

1. *Failed-unit alert (simplest).* Install `/etc/systemd/system/web5-alert@.service`
   whose `ExecStart` posts `%i` to your existing alert endpoint (the repo
   already runs a Telegram bot), e.g.
   `ExecStart=/usr/bin/curl -fsS -m 10 -X POST "$WEBHOOK" -d 'text=%i failed'`,
   then uncomment `OnFailure=web5-alert@%n.service` in
   `ops/web5-backup-offsite.service`, `systemctl daemon-reload`.
2. *Log-based alert (no systemd unit).* The JSON status line is written on
   every run, success or failure:

   ```
   {"ts":"…","event":"backup","status":"fail","exit_code":2,…,"offsite":"not-configured","detail":"…"}
   ```

   Alert on `status != "ok"` from `/var/log/web5/backup-offsite.log` (filebeat,
   Vector, or a 5-line cron that greps the last line). Also alert on **no line
   for 36 hours** — a timer that stopped firing is the quiet failure that bit
   us on 2026-11-01.

Exit codes (useful in the alert text): `0` ok · `1` failure · `2` misconfigured
(usually `OFFSITE_UPLOAD_CMD`) · `3` integrity_check failed · `4` low disk ·
`5` status log not writable · `6` local dir not usable · `7` already running.

## 8. Known gaps

- **Uploaded media is not covered.** If user uploads matter, mirror
  `public/` and `upload/` with the same rclone remote (`rclone sync`) on the
  same timer — that is a separate, larger job and a decision for the lead.
- **No encryption of the archive.** It is gzipped, not encrypted; the provider
  can read it. `gzip | age -r <key>` or `rclone crypt` are the two cheap
  options if that is required.
- **`.env` is not in the backup** by design (it holds keys). Its contents must
  be recoverable from the password manager.
- **Local 03:20 cron backup is unchanged** and still the fast path for "undo
  today".

## 9. Quarterly checklist

- [ ] `systemctl list-timers web5-backup-offsite.timer` — next run within 24h, last run succeeded.
- [ ] `tail -n 20 /var/log/web5/backup-offsite.log` — every line `"status":"ok"`, no gaps > 36h.
- [ ] `rclone lsf remote:web5-backups/` (or equivalent) — one `.db.gz` + `.json` pair per day, count ≈ retention days.
- [ ] `/root/ops/verify-backup.sh --offsite` → `RESULT: PASS`. Corrupt one byte of a copy on purpose once a year and confirm it prints `FAIL`.
- [ ] Restore drill (§6) into a scratch copy — full run, including the five endpoints.
- [ ] Restore drill once with the app *stopped* and once on a *clean* machine (no `/root/web5.blog`, no `.env`) — proves the runbook does not depend on host state.
- [ ] Offsite credentials still valid; rotate the key if anyone with access left.
- [ ] Offsite lifecycle/retention policy still set (30–90 days) and versioning on.
- [ ] `df -h` on the VPS — local retention dir not filling the disk.
- [ ] `backup.env` still mode 600, `rclone.conf`/ssh key still mode 600.
