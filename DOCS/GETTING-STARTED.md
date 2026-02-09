# 🚀 Getting Started - Orion Task System

**Welcome!** This guide will get you from zero to productive in about 30 minutes.

---

## 📋 Table of Contents

- [Quick Setup (TL;DR)](#quick-setup-tldr)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First Run](#first-run)
- [Understanding the Codebase](#understanding-the-codebase)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Common Tasks](#common-tasks)
- [Getting Help](#getting-help)
- [DataStore lifecycle](#datastore-lifecycle)

---

## Quick Setup (TL;DR)

```bash
# 1. Clone and install
git clone <repository-url>
cd orion-task-system
yarn install

# 2. Pull AWS backend
amplify pull --appId d2vty117li92m8 --envName dev

# 3. Start development
yarn start
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
```

---

## Prerequisites

### Required

| Tool                | Version | Install                            |
| ------------------- | ------- | ---------------------------------- |
| **Node.js**         | v14+    | [nodejs.org](https://nodejs.org/)  |
| **Yarn**            | latest  | `npm install -g yarn`              |
| **Expo CLI**        | latest  | `yarn global add expo-cli`         |
| **AWS Amplify CLI** | latest  | `yarn global add @aws-amplify/cli` |

### For Mobile Development

| Platform    | Required                  | Install Guide                                                                                             |
| ----------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **iOS**     | Xcode + iOS Simulator     | [docs.expo.dev/workflow/ios-simulator](https://docs.expo.dev/workflow/ios-simulator/)                     |
| **Android** | Android Studio + Emulator | [docs.expo.dev/workflow/android-studio-emulator](https://docs.expo.dev/workflow/android-studio-emulator/) |

### Verify Installation

```bash
node --version    # Should be v14+
yarn --version    # Should be 1.22+
expo --version    # Should be 6.x+
amplify --version # Should be 12.x+
```

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd orion-task-system
```

### 2. Install Dependencies

```bash
yarn install
```

This installs:

- Root project dependencies
- Workspace package `@orion/task-system` dependencies
- All development tools

**⏱️ Takes ~2-3 minutes**

### 3. Configure AWS Backend

```bash
amplify pull --appId d2vty117li92m8 --envName dev
```

**Follow the prompts:**

- Choose your code editor (VSCode recommended)
- Accept defaults for other options
- This creates `src/aws-exports.js` (needed for backend connection)

**⏱️ Takes ~1-2 minutes**

### 4. iOS Only: Install Pods

If you plan to run on iOS:

```bash
yarn ios:install-pods
```

**⏱️ Takes ~3-5 minutes first time**

---

## First Run

### Start Development Server

```bash
yarn start
```

You'll see:

```
› Metro waiting on exp://192.168.1.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

### Run on iOS Simulator

```bash
# Press 'i' in Metro, or:
yarn ios
```

**First build takes ~5-10 minutes** (subsequent builds are much faster)

### Run on Android Emulator

```bash
# Press 'a' in Metro, or:
yarn android
```

**First build takes ~5-10 minutes** (subsequent builds are much faster)

### Run on Physical Device

1. Install **Expo Go** app from App Store / Play Store
2. Scan QR code from Metro output
3. App will load on your device

---

## Understanding the Codebase

### Project Structure

```
orion-task-system/
├── app/                    # Expo Router pages (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   ├── modal.tsx          # Modal screens
│   └── _layout.tsx        # Root layout
├── src/                   # Harness-specific code
│   ├── components/        # App-specific container components
│   ├── hooks/             # App-specific custom hooks
│   ├── services/          # App-specific services
│   └── types/             # App-specific TypeScript types
├── packages/
│   └── task-system/       # @orion/task-system package (source of truth)
│       ├── src/
│       │   ├── modules/      # Module wrappers (TaskActivityModule)
│       │   ├── components/   # Reusable UI components
│       │   ├── hooks/        # Business logic hooks
│       │   ├── services/     # Data layer (TaskService, etc.)
│       │   ├── schemas/      # Validation schemas (Zod)
│       │   ├── types/        # TypeScript type definitions
│       │   ├── constants/    # Shared constants
│       │   ├── translations/ # i18next translation system
│       │   └── utils/        # Utility functions
│       ├── docs/           # Package documentation (MDX)
│       ├── config/         # Package configuration
│       └── package.json
├── amplify/              # AWS backend configuration
├── DOCS/                 # Documentation (you are here!)
└── scripts/              # Build & utility scripts
```

### Architecture Pattern

We follow a **clean separation of concerns**:

```
┌─────────────────────────────────────────────┐
│  Container Components (Logic + Hooks)       │
│  Location: src/components/                  │
└──────────────┬──────────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────────┐
│  Hooks (Business Logic + State)             │
│  Location: packages/task-system/src/hooks/  │
└──────────────┬──────────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────────┐
│  Services (Data Operations)                 │
│  Location: packages/task-system/src/services│
└──────────────┬──────────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────────┐
│  AWS DataStore (Offline-First Database)     │
└─────────────────────────────────────────────┘
```

**Key Principle**: Logic flows **down**, data flows **up**.

### Key Technologies

| Technology        | Purpose                 | Where Used           |
| ----------------- | ----------------------- | -------------------- |
| **React Native**  | Cross-platform mobile   | Everywhere           |
| **Expo**          | Development platform    | Build, deployment    |
| **TypeScript**    | Type safety             | Everywhere           |
| **Expo Router**   | File-based navigation   | `app/` directory     |
| **AWS DataStore** | Offline-first data sync | Services layer       |
| **AWS AppSync**   | GraphQL API + realtime  | Backend              |
| **Jest**          | Unit testing            | `*.test.ts(x)` files |

---

## Development Workflow

### 1. Pick a Task

Check current priorities:

- [`DOCS/planning/roadmap.md`](planning/roadmap.md) - High-level priorities
- [`DOCS/planning/todos.md`](planning/todos.md) - Current todos
- GitHub Issues - Team-assigned tasks

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

**Naming convention:**

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation updates

### 3. Make Your Changes

**Follow these rules:**

- 📝 Read [`.cursor/rules/`](.cursor/rules/) for coding standards
- 🧪 Write tests for all new code (mandatory)
- 📚 Update documentation when needed
- 🎨 Follow existing patterns in the codebase

### 4. Test Your Changes

```bash
# Run unit tests
yarn test

# Run specific test file
yarn test TaskService.test.ts

# Run tests in watch mode (recommended during development)
yarn test:watch

# Check test coverage
yarn test:coverage
```

### 5. Lint & Format

```bash
# Check for linting errors
yarn lint

# Format code
yarn format

# Type check
yarn check:types
```

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: add task filtering by priority

- Add priority filter to TaskList
- Update TaskService to support priority queries
- Add tests for priority filtering"
```

**Commit message format:**

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code improvement
- `test:` - Test updates
- `docs:` - Documentation
- `chore:` - Build/tooling changes

### 7. Push & Create PR

```bash
git push origin feature/your-feature-name
```

Create a Pull Request on GitHub with:

- Clear description of changes
- Screenshots/videos for UI changes
- Reference to related issues

---

## Testing

### Writing Tests

**Every new file needs tests.** No exceptions.

**Test file naming:**

- `MyComponent.tsx` → `MyComponent.test.tsx`
- `useMyHook.ts` → `useMyHook.test.ts`
- `MyService.ts` → `MyService.test.ts`

**Example test:**

```typescript
import { render, screen } from '@testing-library/react-native';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  it('displays task title', () => {
    const task = { id: '1', title: 'Test Task', status: 'pending' };
    render(<TaskCard task={task} />);
    expect(screen.getByText('Test Task')).toBeTruthy();
  });
});
```

**📖 See:** [`DOCS/development/testing.md`](development/testing.md) for comprehensive testing guide

### Running Tests

```bash
# All tests
yarn test

# Watch mode (re-runs on file changes)
yarn test:watch

# Coverage report
yarn test:coverage

# Specific test file
yarn test MyComponent.test.tsx
```

### Coverage Requirements

- **Minimum**: 70% overall coverage (current)
- **Target**: 80% overall coverage
- **New code**: Should have 90%+ coverage

---

## Common Tasks

### Reset Local Database

```bash
yarn reset-project
```

Clears all local DataStore data and reseeds with fixture data.

### Reset & Reseed

```bash
yarn reset-and-reseed
```

Full reset + reseed with POC tasks and appointments.

### View Storybook (Component Library)

1. Run the app: `yarn ios` or `yarn android`
2. Tap menu icon (☰) → **"Storybook"**
3. Browse 21 interactive component stories

### Check for Circular Dependencies

```bash
yarn check:circular
```

### Generate Coverage Report

```bash
yarn test:coverage
open coverage/lcov-report/index.html
```

### Run E2E Tests

```bash
# Web (Playwright)
yarn e2e:web

# Mobile (Maestro - requires physical device/emulator)
yarn e2e:maestro
```

---

## Documentation Structure

After cleanup, documentation is organized into clear categories:

```
DOCS/
├── GETTING-STARTED.md           ← You are here!
├── README.md                    ← Documentation index
│
├── architecture/                ← System design & structure
│   ├── architectural-review-2025-01-03.md
│   ├── aws-architecture.md
│   ├── component-library.md
│   ├── project-structure.md
│   └── service-consolidation.md
│
├── development/                 ← Coding standards & guides
│   ├── development-guidelines.md    (READ THIS FIRST)
│   ├── testing.md
│   ├── any-type-analysis.md
│   ├── logging-service.md
│   └── font-system.md
│
├── features/                    ← Feature documentation
│   ├── implementation-status.md     (What's built)
│   ├── task-system-package.md
│   ├── translations.md
│   └── analytics-implementation.md
│
├── planning/                    ← Roadmap & todos
│   ├── roadmap.md                   (Priorities)
│   ├── todos.md
│   └── current-rule-logic.md
│
├── testing/                     ← Test coverage & guides
│   ├── poc-json-loading-guide.md
│   └── test-progress-summary.md
│
└── troubleshooting/             ← Common issues & fixes
    ├── native-build-fixes.md
    └── image-storage-native-module-error.md
```

### Key Documents to Read First

1. **[Development Guidelines](development/development-guidelines.md)** - Coding standards
2. **[Component Library](architecture/component-library.md)** - UI component patterns
3. **[Testing Guide](development/testing.md)** - How to write tests
4. **[Implementation Status](features/implementation-status.md)** - What's done/not done
5. **[Roadmap](planning/roadmap.md)** - What we're building next

---

## Getting Help

### 🐛 Something Broken?

1. Check [`DOCS/troubleshooting/`](troubleshooting/) for known issues
2. Search existing GitHub Issues
3. Ask in team Slack/Discord
4. Create a new GitHub Issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/error logs

### ❓ How Do I...?

| Question                         | Resource                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------- |
| How do I create a new component? | [Component Library](architecture/component-library.md)                          |
| How do I write tests?            | [Testing Guide](development/testing.md)                                         |
| How does data sync work?         | [AWS Architecture](architecture/aws-architecture.md)                            |
| How do I reset DataStore safely? | [DataStore lifecycle and resets](development/datastore-lifecycle-and-resets.md) |
| How do I add a new feature?      | [Development Guidelines](development/development-guidelines.md)                 |
| What's already implemented?      | [Implementation Status](features/implementation-status.md)                      |

### 📚 External Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## Next Steps

Now that you're set up:

1. ✅ **Explore the app** - Run it, click around, understand the UI
2. ✅ **Read the component library** - [`DOCS/architecture/component-library.md`](architecture/component-library.md)
3. ✅ **Check the roadmap** - [`DOCS/planning/roadmap.md`](planning/roadmap.md)
4. ✅ **Pick a small task** - Start with something low-risk
5. ✅ **Write your first test** - Get comfortable with testing patterns
6. ✅ **Create your first PR** - Get feedback from the team

---

## Quick Reference

### Essential Commands

```bash
# Development
yarn start              # Start Metro bundler
yarn ios                # Run iOS simulator
yarn android            # Run Android emulator

# Testing
yarn test               # Run all tests
yarn test:watch         # Watch mode
yarn test:coverage      # Coverage report

# Code Quality
yarn lint               # Check linting
yarn format             # Format code
yarn check:types        # TypeScript check
yarn check:circular     # Check circular deps

# Database
yarn reset-project      # Clear & reseed DB
yarn reset-and-reseed   # Full reset

# Build
yarn build:task-system  # Build @orion/task-system package
```

### Key File Locations

```
📁 Module Wrappers → packages/task-system/src/modules/
📁 Components      → packages/task-system/src/components/
📁 Hooks           → packages/task-system/src/hooks/
📁 Services        → packages/task-system/src/services/
📁 Schemas         → packages/task-system/src/schemas/
📁 Types           → packages/task-system/src/types/
📁 Translations    → packages/task-system/src/translations/
📁 Tests           → Next to source files (*.test.ts[x])
📁 Screens         → app/(tabs)/
📁 GraphQL Schema  → amplify/backend/api/lxtodoapp/schema.graphql
📁 Documentation   → DOCS/
```

---

**Welcome to the team! 🎉**

If you have questions or suggestions for improving this guide, please create a PR or ask in Slack!
