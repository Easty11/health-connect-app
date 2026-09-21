# Spec — `health-app` backend: persist sync build-fingerprint + fetch telemetry

**For a `health-app` Code session.** HCA (this repo) now emits two additive top-level keys on
`POST /health-connect/sync`. `SyncPayload` is `extra="allow"`, so they are **tolerated but not
persisted** today — they land in `model_extra` and are dropped. This spec adds the models, a table,
and the persistence.

**Sequencing (operator ruling, 2026-09-21): this backend work deploys BEFORE any HCA rebuild.** The
fingerprint has nowhere to land until the table and persistence are live, so the migration + persist
must be in prod first; only then is the HCA APK rebuilt/installed. This is a **schema migration → a
merge HOLD**: self-merge is not permitted; wait for the operator's explicit land instruction.

## 1. Wire contract HCA now sends

```jsonc
{
  "syncedAt": "…", "periodDays": 7,
  "client": {
    "gitSha":     "6fd8b3e",            // `git describe --always --dirty`; may carry a "-dirty" suffix
    "builtAt":    "2026-09-21T05:02:53.536Z",
    "appVersion": "1.0.0",
    "platform":   "android"
  },
  "fetchMeta": {                          // one entry per stream HCA fetched
    "heartRate": { "received": 987, "oldestAt": "…Z", "newestAt": "…Z", "pages": 1, "truncated": true,  "endedOnFailure": false },
    "sleep":     { "received": 12,  "oldestAt": "…Z", "newestAt": "…Z", "pages": 1, "truncated": false, "endedOnFailure": false }
    // hrv, steps, workouts likewise; oldestAt/newestAt are null when received == 0
  },
  "sleep": [...], "hrv": [...], "heartRate": [...], "steps": [...], "workouts": [...], "errors": [...]
}
```

- `truncated == endedOnFailure || (page cap hit with a token still set)`. Under a healthy paginating
  build a normal fetch is `truncated:false`; `heartRate.truncated` flipping to `true` post-fix is the
  alarm that the recent end is being dropped again.
- **Old builds send neither key.** Both are optional; absence must be normal, not a 422.

## 2. Pydantic (`backend/routers/health_connect.py`)

Add, and reference from `SyncPayload` (keep `extra="allow"`):

```python
class ClientInfo(BaseModel):
    model_config = ConfigDict(extra="allow")
    gitSha: Optional[str] = None
    builtAt: Optional[str] = None
    appVersion: Optional[str] = None
    platform: Optional[str] = None

class FetchMetaEntry(BaseModel):
    model_config = ConfigDict(extra="allow")
    received: int = 0
    oldestAt: Optional[str] = None
    newestAt: Optional[str] = None
    pages: int = 0
    truncated: bool = False
    endedOnFailure: bool = False

# on SyncPayload:
    client: Optional[ClientInfo] = None
    fetchMeta: dict[str, FetchMetaEntry] = {}
```

Both optional-defaulted → an old build's payload (neither key) validates unchanged.

## 3. New table `health_connect_sync_events` (`backend/models.py`)

One row **per POST** (not per date — a `periodDays=7` POST fans out to ~7 `health_connect_syncs`
rows; the fingerprint describes the sync event, not a date).

```python
class HealthConnectSyncEvent(Base):
    __tablename__ = "health_connect_sync_events"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    git_sha: Mapped[str | None] = mapped_column(String(80))      # NULL == old build (see below) — first-class, queryable
    built_at: Mapped[str | None] = mapped_column(String(40))
    app_version: Mapped[str | None] = mapped_column(String(40))
    platform: Mapped[str | None] = mapped_column(String(40))
    period_days: Mapped[int | None] = mapped_column(Integer)
    fetch_meta: Mapped[dict | None] = mapped_column(JSONB)       # the fetchMeta object verbatim
```

- **`git_sha` nullable is meaningful, not sloppy.** The pre-4-Sep build sends no `client`; so do the
  first syncs from a phone not yet updated. **A NULL `git_sha` is exactly the "still on an old build"
  signal** — the thing that would have saved the `dumpsys` read this workstream needed. Keep it a
  first-class column (queryable: `WHERE git_sha IS NULL`), not buried in JSON.
- `fetch_meta` as **JSONB** (ruling 2): flexible; the query need is low-frequency diagnostics.
- Postgres prod uses `JSONB`; if the test path builds via `create_all` on SQLite, use the portable
  `JSON` type (SQLAlchemy `JSON`) or a JSONB/JSON variant so both dialects create.

## 4. Migration

New Alembic revision chained off the current head (mirror the existing
`*_add_health_connect_*` revisions), `create_table("health_connect_sync_events", …)` with an index on
`(user_id, synced_at)`. Down-revision = current head; `downgrade()` drops the table.

## 5. Persistence in `sync()`

After `received` is computed (payload counted as-posted) and before/around `_capture_record_sources`,
insert ONE `HealthConnectSyncEvent`:

```python
client = payload.client
db.add(models.HealthConnectSyncEvent(
    user_id=current_user.id,
    git_sha=(client.gitSha if client else None),
    built_at=(client.builtAt if client else None),
    app_version=(client.appVersion if client else None),
    platform=(client.platform if client else None),
    period_days=payload.periodDays,
    fetch_meta={k: v.model_dump() for k, v in payload.fetchMeta.items()} or None,
))
# committed with the existing db.commit() at the end of sync()
```

Capture only — it filters nothing and touches no aggregation. Optionally add
`"sync_event": {"git_sha": …, "any_truncated": …}` to the `/sync` response for at-a-glance operator
visibility (not required; no client consumes the response yet — see the note at the `return`).

## 6. Gates

- **Backend unit:** a POST carrying `client` + `fetchMeta` inserts one `health_connect_sync_events`
  row with the right `git_sha` and `fetch_meta`; a POST with neither key inserts a row with
  `git_sha IS NULL` and does not 422.
- **G2 (operator, post-deploy + post-rebuild):** a real sync from the fingerprinted build arrives with
  a **non-null `git_sha`**, and `heartRate.newestAt` is within hours of `synced_at` — which finally
  makes **Q21.1** runnable and, if it passes, closes **Q22**.

## 7. What NOT to do
- Do not down-sample HR, add permissions, or add record types (GUARD).
- Do not stamp the fingerprint onto `health_connect_syncs` date-rows (wrong granularity).
- Do not self-merge (schema migration = HOLD; deploy before the HCA rebuild).
