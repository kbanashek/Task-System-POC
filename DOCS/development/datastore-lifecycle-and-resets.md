## Overview

This repo is **offline-first** and relies on AWS Amplify DataStore. To keep behavior stable across iOS/Android and across host apps (LX, task-system harness), we standardize:

- **Lifecycle event handling** (Hub events) via `dataStoreHub`
- **Reset flows** (stop / clear / start) via `resetDataStore` with:
  - **timeouts** (avoid hanging forever)
  - **outbox awareness** (best-effort wait for outbox empty)

## Source of truth: utilities

- **Hub events (normalized)**: `packages/task-system/src/utils/datastore/dataStoreHub.ts`
  - Used by `packages/task-system/src/hooks/useAmplifyState.ts`
  - Used by `packages/task-system/src/services/FixtureImportService.ts`
- **Reset orchestration**: `packages/task-system/src/utils/datastore/dataStoreReset.ts`
  - Exported from `@orion/task-system` package entry (`packages/task-system/src/index.ts`)
  - Used by harness reset helpers in `src/utils/syncUtils.ts`

## Why outbox awareness matters

In practice, `DataStore.stop()` can hang under some conditions (e.g. pending outbox mutations + unreliable network). Before stopping, we do a **best-effort wait** for the Hub `outboxStatus` event to report `isEmpty: true`.

- If outbox becomes empty quickly: stop proceeds normally.
- If outbox doesn’t become empty (offline / stuck): we **timeout and continue** (dev tooling should not deadlock).

## Recommended reset patterns

### Restart DataStore (stop → start)

Use when you want a fresh sync cycle without wiping local storage.

- Host app helper: `src/utils/syncUtils.ts` → `forceFullSync()`
- Direct usage:

```ts
import { DataStore } from "@aws-amplify/datastore";
import { Hub } from "@aws-amplify/core";
import { resetDataStore } from "@orion/task-system";

await resetDataStore({ dataStore: DataStore, hub: Hub }, { mode: "restart" });
```

### Clear + restart (stop → clear → start)

Use when local sync metadata is suspected corrupted and you need a full resync from cloud.

- Host app helper: `src/utils/syncUtils.ts` → `clearCacheAndResync()`
- Direct usage:

```ts
await resetDataStore(
  { dataStore: DataStore, hub: Hub },
  { mode: "clearAndRestart" }
);
```

## Notes for onboarding

- Prefer **`resetDataStore`** over ad-hoc `DataStore.stop()/clear()/start()` sequences.
- Prefer **`dataStoreHub`** over raw `Hub.listen("datastore", ...)` to avoid inconsistent event handling.
- Keep reset logic **out of UI components**; call from hooks/services/dev tooling and keep rendering pure.
