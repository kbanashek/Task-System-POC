## Purpose

This file gives succinct, actionable guidance to AI coding agents working on this repository so they can be immediately productive. It focuses on architecture, developer workflows, project conventions, and integration points discovered in repository documentation and cursor rules.

**Big picture**

- **Platform:** Expo + React Native app using TypeScript and AWS Amplify (DataStore/AppSync) for offline-first sync. See [README.md](README.md) for architecture diagrams and stack decisions.
- **Monorepo layout:** Root app + a workspace package `@orion/task-system` located at [packages/task-system](packages/task-system). The package is intended to be self-contained and reusable by host apps (see [DOCS/features/task-system-package.md](DOCS/features/task-system-package.md)).
- **Patterns:** UI components are presentation-only; business logic lives in custom hooks (`src/hooks/*`) and services (`src/services/*`). Utilities must be extracted to `packages/task-system/src/utils/` (see `.cursor/rules/architecture.mdc`).

**Key files & rules to consult**

- Cursor rules: [.cursorrules](.cursorrules) and the rules in [.cursor/rules/](.cursor/rules/) (notably `development.mdc`, `architecture.mdc`, and `local-dev-task-system-link.mdc`). These contain mandatory conventions (tests, logging, package placement, local linking).
- Bootstrapping & scripts: `package.json` (root) — primary dev/test/build commands and `build:task-system` script.
- Dev docs: [DOCS/](DOCS/) holds architecture, logging-service, testing, and troubleshooting guides.

**Developer workflows AI must follow (explicit commands)**

- Install & workspace: `yarn install` (use `IS_LOCAL=true yarn install` in host repo when using private CodeArtifact tokens as noted in `orion-mobile/README.md`).
- Local LX integration (critical): The host app must use a symlinked package, not `file:`. In host `package.json` use: `"@orion/task-system": "link:../../orion-task-system/packages/task-system"`. Run the combined dev runner from the host: `yarn dev:task-system` (see `.cursor/rules/local-dev-task-system-link.mdc`).
- Verify symlink when debugging: `ls -la node_modules/@orion/task-system` should show a symlink to the package.
- Start app (root): `yarn start` or platform builds `yarn ios` / `yarn android`. Native fixes run via `./scripts/apply-native-fixes.sh` before native builds.
- Build package: `yarn build:task-system` (used by CI and local checks).
- Tests: `yarn test`, `yarn test:watch`, `yarn test:coverage`. Follow test location conventions in `.cursor/rules/development.mdc` (tests alongside source; naming for hooks, services, components).

**Project-specific conventions (must be enforced by AI changes)**

- Tests are required for every new file. Always create test file alongside new implementation. Examples in `.cursor/rules/development.mdc` show expected test file paths.
- Extract pure helper functions into `utils/` with unit tests (do not leave standalone functions inside components). See `packages/task-system` guidance in `architecture.mdc`.
- Logging: Use central logging helpers (`useLogger`, `getLoggingService`, `logWithPlatform`, `logErrorWithPlatform`) instead of `console.log`. Logs must include platform (`[iOS]`, `[Android]`, `[Web]`), step tags (`[INIT-N]` / `[DATA-N]`), and icons. See `.cursor/rules/development.mdc` for exact formats and examples.
- Documentation: Add longer technical docs to `DOCS/` and use Mermaid for diagrams. Keep README concise and link to DOCS.

**Logging Standards (required)**

- Message format: `[ICON] [PLATFORM] [STEP] ServiceName: Concise message` — always include platform (`[iOS]`, `[Android]`, `[Web]`).
- Use step tags for initialization/data flows: `INIT-1`..`INIT-7`, `DATA-1`..`DATA-3` to make sequences discoverable.
- Icon conventions (use these): `🚀, ✅, ❌, ⚠️, ☁️, 🔐, ⚙️, 📋, 📅, 💾, 🔄, 📤, 📥, 🗑️`.
- DO NOT log full JSON blobs or raw `console.log` output. Log summaries (counts, key fields) or formatted bullet lists.
- Always use `platformLogger.ts` utilities (`logWithPlatform`, `logErrorWithPlatform`) or `useLogger` / `getLoggingService` to ensure consistent formatting.

**Testing Requirements (strict enforcement)**

- Test files MUST be created alongside new source files. Naming conventions:
  - Hooks: `src/hooks/__tests__/useHookName.test.ts`
  - Services: `src/services/__tests__/ServiceName.test.ts`
  - Components: `src/components/__tests__/ComponentName.test.tsx` or `src/components/[category]/__tests__/ComponentName.test.tsx`
  - Utils: `src/utils/__tests__/utilityName.test.ts`
- Coverage expectations by artifact:
  - Hooks: initial state, updates, side effects, cleanup
  - Services: public methods, error handling, data transforms
  - Components: render, interactions, props, conditional rendering
- Use `jest` with `@testing-library/react-native`. Mock external systems (`DataStore`, `AsyncStorage`, network`).

**Documentation & Diagrams**

- Put long-form technical docs in `DOCS/` (architecture, AWS, troubleshooting). Keep `README.md` concise and link to `DOCS/`.
- ALWAYS use Mermaid for diagrams (flowchart, sequence, class, ER). Do not use ASCII art. Example file: `DOCS/architecture/*`.
- Use descriptive kebab-case filenames and include a short table-of-contents for long docs.

**Project Todos & Runbook**

- Do NOT leave TODO comments in code. Track todos in `DOCS/planning/todos.md` using `- [ ]` and `- [x]` formats. Include file paths and rationale for each todo.

**Package vs Harness Protocol (explicit)**

- Default: implement reusable/domain logic in `packages/task-system/`.
- Prompt the user before moving code between harness and package. If authorized, follow this migration sequence:
  1.  Move logic into `packages/task-system/src/...`.

2.  Add/adjust unit tests in the package.
3.  Update harness imports to consume the package API.
4.  Run `yarn build:task-system` (or `yarn dev:task-system` from host) and run tests.

**Integration points & external deps**

- AWS Amplify / DataStore — Amplify configuration is app-level. Look at `amplify/` for backend config and `aws-exports.js` for environment wiring.
- Expo / EAS — builds use EAS and CNG; native code is generated by Expo prebuild when required. See `orion-mobile/README.md` and `package.json` scripts.
- Private registry & CodeArtifact — repo expects CodeArtifact credentials for CI; local flow supports `IS_LOCAL=true` for local installs (or `yarn install --ignore-scripts` as a workaround documented in `.cursor/rules/local-dev-task-system-link.mdc`).

**Advice for code changes (what AI should do and avoid)**

- Always create or update unit tests with code changes. Follow naming patterns in `.cursor/rules/development.mdc`.
- When moving logic between harness and package, prompt the user and document the architectural rationale. The repo enforces a protocol: do not autonomously make package-vs-harness decisions (see `architecture.mdc`).
- Prefer extracting utilities into `packages/task-system/src/utils/` with tests rather than embedding in components.
- Use existing logging utilities for all messages; conform to icon and platform rules for readability and automation.

**Examples to reference in PRs or edits**

- Hook + component separation example: see [app/(tabs)/my-component.tsx](app) and `src/hooks` patterns shown in `DOCS/architecture/component-library.md`.
- Local-dev linking and dev runner: see `.cursor/rules/local-dev-task-system-link.mdc` and `package.json` scripts `build:task-system` and `dev:task-system` (host app must define the runner).
- Test patterns: examples in `.cursor/rules/development.mdc` (hooks, services, components test locations).

If anything above is unclear or you want additional examples (package internals, specific hook/service locations, or merging content from other repos), tell me which area to expand and I'll iterate.

Concrete examples (copyable)

- Logging (service code):

```typescript
import { getLoggingService } from "../services/LoggingService";

const logger = getLoggingService().createLogger("TaskService");

logger.info("Task created", { taskId }, "DATA-1", "📋");
logger.error("Failed to save task", error, "TaskService", "DATA-1", "❌");
```

- Logging (React hook / component):

```typescript
import { useLogger } from "../hooks/useLogger";

const MyComponent = () => {
  const logger = useLogger();
  logger.info("Mounted", undefined, "MyComponent", "INIT-2", "🚀");
};
```

- Test skeleton for a hook (`src/hooks/__tests__/useExample.test.ts`):

```typescript
import { renderHook, act } from "@testing-library/react-hooks";
import { useExample } from "../useExample";

describe("useExample", () => {
  it("updates state when called", () => {
    const { result } = renderHook(() => useExample());
    act(() => result.current.doSomething());
    expect(result.current.value).toBeTruthy();
  });
});
```

- Extract utility example (move pure function to `packages/task-system/src/utils/`):

`packages/task-system/src/utils/formatDate.ts`

```typescript
export const formatDate = (ms?: number) =>
  ms ? new Date(ms).toISOString().split("T")[0] : "no date";
```

- Local link verification & dev runner (host app):

```bash
# Ensure package is symlinked
ls -la node_modules/@orion/task-system

# Start combined dev runner from host (required for live package changes)
yarn dev:task-system
```

- Build & test common commands (repo root):

```bash
yarn install
yarn build:task-system
yarn start
yarn ios
yarn android
yarn test
```

Additional high-priority rules (from `.cursor/rules`)

- Code style / TypeScript
  - **No `any`**: never introduce `any`; use `unknown`, generics, or proper interfaces.
  - **Explicit return types** for public APIs and exported functions.
  - **Prefer interfaces** for object shapes; use `readonly` for immutable fields.
  - **Avoid `@ts-ignore`**; fix types instead.
  - **Object-map pattern**: prefer object maps over switch/if-else for static mappings.

- JSDoc & Documentation
  - **All hooks, services, utils, and public components require JSDoc** with `@param`, `@returns`, and `@example` where applicable.
  - Use `DOCS/` for long-form docs and Mermaid diagrams.

- Path aliases
  - Use the package path aliases (e.g., `@hooks/*`, `@services/*`, `@utils/*`, `@task-types/*`) instead of relative imports inside `packages/task-system`.

- Zero-errors enforcement (pre-commit / pre-push)
  - Before commit: `yarn check:types` and `yarn lint` must pass. Pre-commit hooks enforce integrity, lint, format, and types.
  - Before push: all tests must pass (`yarn test`).
  - Treat ESLint warnings as errors; no `--no-verify` commits except with explicit user approval and documented follow-up.

- Git workflow & PR expectations
  - Branch from `develop`; branch naming: `<username>/feature/<desc>` or `<username>/<type>/<desc>`.
  - Commit messages must be descriptive; follow semantic versioning for package bumps and update `CHANGELOG.md` on changes.

- CI & GitHub Actions
  - PR Checks should run separate `lint` and `unit-tests` jobs in parallel. Unit tests should include coverage and may skip AWS-dependent tests in CI.
  - `test-coverage` runs on push to `develop`/`main` and uploads artifacts.
  - CI must handle CodeArtifact auth gracefully (fall back or `continue-on-error`).

These items are enforced by `.cursor/rules/*` and must be followed by any AI agent making edits.

Expanded examples

1. JSDoc templates (copyable)

- Hook template:

````typescript
/**
 * Hook: `useExample`
 *
 * Short description (1 line).
 *
 * Long description (when needed) describing side-effects, subscriptions, and return shape.
 *
 * @param {ExampleOptions} options - Optional configuration for the hook
 * @returns {UseExampleReturn} Object containing state and operations
 *
 * @example
 * ```tsx
 * const { value, doSomething } = useExample({ enabled: true });
 * ```
 */
export const useExample = (options?: ExampleOptions): UseExampleReturn => {
  // implementation
};

/**
 * Return shape for `useExample`
 */
export interface UseExampleReturn {
  /** current value */
  value: string;
  /** perform action */
  doSomething: () => Promise<void>;
}
````

- Service class template:

````typescript
/**
 * Service: `TaskService`
 *
 * Manages `Task` persistence via AWS DataStore and provides helpers for
 * common task operations used across the package.
 *
 * @example
 * ```ts
 * const task = await TaskService.createTask({ title: 'Example' });
 * ```
 */
export class TaskService {
  /**
   * Create a new task.
   *
   * @param input - Task creation payload
   * @returns The created `Task` model
   * @throws Error when creation fails
   */
  static async createTask(input: CreateTaskInput): Promise<Task> {
    // implementation
  }
}
````

- Utility function template:

```typescript
/**
 * formatDate
 *
 * Format milliseconds to YYYY-MM-DD or return 'no date'.
 *
 * @param {number | undefined} ms - milliseconds since epoch
 * @returns {string} formatted date or 'no date'
 */
export const formatDate = (ms?: number): string =>
  ms ? new Date(ms).toISOString().split("T")[0] : "no date";
```

2. Example GitHub Actions YAML (PR Checks)

Add this as a reference for `.github/workflows/pr-checks.yml`. It separates `lint` and `unit-tests`, skips AWS-dependent tests in CI, and uploads coverage artifacts.

```yaml
name: PR Checks

on:
  pull_request:
    branches: [develop, main]
    types: [opened, synchronize, reopened]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: yarn install --frozen-lockfile
      - run: yarn lint

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: yarn install --frozen-lockfile
      - name: Run tests (skip AWS-dependent tests)
        run: |
          yarn test --coverage --watchAll=false --passWithNoTests --testPathIgnorePatterns=".*(TranslationService|DataStore|Amplify).*"
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

3. Logging example using `logWithPlatform`

```typescript
import { logWithPlatform } from "@runtime/platformLogger";

logWithPlatform(
  "📋",
  "[iOS]",
  "useTaskList",
  `Received ${items.length} tasks (synced-with-cloud)`,
  { count: items.length }
);
```

Notes: these examples are intended to be copy-paste friendly and follow the repository's enforcement rules (JSDoc, no `any`, tests alongside code, logging format).
