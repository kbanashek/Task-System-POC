# Spike: RNFS → Expo FileSystem Inventory and Mapping

Date: 2026-01-28

## Purpose

Inventory RNFS usages across the workspace, provide a mapping to `expo-file-system`, and record prioritized migration targets and risks.

## Summary

- Host app heavily uses `@dr.pogodin/react-native-fs` (RNFS) for images, downloads, content storage and sync utilities.
- `@orion/task-system` already uses `expo-file-system` in `packages/task-system/src/utils/system/fileSystemUtils.ts`.
- Prototype adapter created at `packages/task-system/src/utils/system/rnfsAdapter.ts` with unit tests.

## Inventory (high-priority files)

- orion-mobile/Lumiere/src/components/activities/module/ImageCapture/index.js — image capture, readFile(base64), store in DocumentDirectoryPath
- orion-mobile/Lumiere/src/components/auth/components/DownloadContent/DownloadContentScreen.js — content downloads and storage
- orion-mobile/Lumiere/src/components/tasks/AdminBackupSyncUtility.ts — read/write image backup files
- orion-mobile/Lumiere/src/components/studyLib/components/VideoPlayer.tsx — file path resolution and read
- orion-mobile/Lumiere/src/components/studyLib/components/DocumentViewer.js — readDir and get file info
- orion-mobile/Lumiere/src/components/tasks/UnsyncTaskUtility.js — readDir, readFile for cleanup
- orion-mobile/Lumiere/src/features/initialization/services/ContentDownloadService.ts — initial content copy & read

## Mapping Table (common RNFS -> expo-file-system)

- `RNFS.DocumentDirectoryPath` -> `FileSystem.documentDirectory`
- `RNFS.readFile(path, 'base64')` -> `FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 })`
- `RNFS.readFile(path, 'utf8')` -> `FileSystem.readAsStringAsync(path)`
- `RNFS.writeFile(path, data, 'base64')` -> `FileSystem.writeAsStringAsync(path, data, { encoding: FileSystem.EncodingType.Base64 })`
- `RNFS.readdir(path)` -> `FileSystem.readDirectoryAsync(path)`
- `RNFS.unlink(path)` -> `FileSystem.deleteAsync(path, { idempotent: true })`
- `RNFS.mkdir(path)` -> `FileSystem.makeDirectoryAsync(path, { intermediates: true })`
- `RNFS.copyFile(from,to)` -> `FileSystem.copyAsync({ from, to })`
- `RNFS.moveFile(from,to)` -> `FileSystem.moveAsync({ from, to })`
- `RNFS.downloadFile(...)` -> `FileSystem.downloadAsync(...)` or createDownloadResumable (note: behavior differs)
- `RNFS.stat(path)` -> `FileSystem.getInfoAsync(path)`

## Gaps / Incompatible Areas

- Background/resumable downloads: RNFS exposes different low-level APIs; `expo-file-system` provides `createDownloadResumable` but behavior/performance should be validated.
- Streaming and low-level binary APIs: RNFS has richer streaming APIs that `expo-file-system` may not match.
- Android content URIs and permission semantics may need extra handling.
- Performance for large files must be validated.

## Prioritized next targets

1. `ImageCapture` (low-risk, focused read/write base64 flows) — ideal first instrument.
2. `ContentDownloadService` (download + move) — validate download behavior.
3. `UnsyncTaskUtility` (cleanup operations using readDir/delete) — good fit.

## Prototype status

- Adapter: `packages/task-system/src/utils/system/rnfsAdapter.ts` (exports subset of RNFS API via `expo-file-system`)
- Tests: `packages/task-system/src/utils/system/__tests__/rnfsAdapter.test.ts` — all tests passed locally.

## Recommended migration approach

1. Implement adapter + unit tests in `@orion/task-system` (done).
2. Instrument one host module (`ImageCapture`) to use adapter via a conditional import (adapter if present, otherwise RNFS) and validate.
3. Run QA/perf tests on devices for large-file and background download scenarios.
4. Gradually switch modules from RNFS -> adapter, updating tests/mocks.
5. If significant gaps remain, adopt hybrid approach (adapter + RNFS for specific cases) and document the exceptions.

## Decision checklist

- Approve 2–4 day spike to complete inventory, mapping, and instrument `ImageCapture` (recommended).
- Decide on full migration vs hybrid fallback after spike results.

## Contact

For technical questions: reach out to the implementer listed on the PR (I can open it).
