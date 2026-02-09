# LX Integration Resources

This directory contains reference implementations and examples for LX teams integrating the `@orion/task-system` package.

## Local development workflow (LX in separate repo)

LX should consume `@orion/task-system` from the compiled `dist/` entrypoint. For local development:

1. Add a `file:` dependency in LX:
   - `@orion/task-system`: `file:../../orion-task-system/packages/task-system`
2. Run the single LX dev command:
   - `yarn dev:task-system`

This starts Expo/Metro and runs the task-system `build:watch` in parallel so edits to this repo
rebuild `dist/` and Metro can pick them up via Fast Refresh/reload.

## Files

### `LXHostExample.tsx`

A complete example component showing how LX should integrate the task-system package:

- Host-owned Amplify configuration
- Host-owned DataStore lifecycle management
- Fixture import for test data
- Temp answer sync configuration (for reference)

**Note:** This is a reference example. The actual app implementation uses `src/bootstrap/taskSystemBootstrap.ts` for configuration.

## Implementation

The actual implementation for this app is in:

- **`src/bootstrap/taskSystemBootstrap.ts`** - Single source of truth for app initialization
  - Configures `TempAnswerSyncService` with real Amplify GraphQL API
  - Initializes task-system runtime
  - Starts DataStore

The dashboard (`app/(tabs)/index.tsx`) uses `TaskActivityModule` directly, which relies on the bootstrap configuration.

## For LX Teams

When integrating `@orion/task-system` into your app:

1. Configure Amplify in your app initialization
2. Call `bootstrapTaskSystem()` or configure `TempAnswerSyncService` manually
3. Mount `<TaskActivityModule />` in your app

See `LXHostExample.tsx` for a complete working example.
