# meteor-upgrade-to-3
> Zero-DRAMA codemods to migrate Meteor **2.x → 3.x** (Fibers → **async/await**), plus guardrails, reports, and git-friendly commits.

Meteor 3 replaces Fibers with standard Promises and introduces async versions of most APIs. Doing this by hand across a big codebase is… not fun. This CLI runs safe, AST-based codemods to update your code automatically, leaves breadcrumbs where a human should review, and commits changes in small, reviewable chunks.

---

## Highlights

- 🔁 **Codemods for Meteor 3 async APIs**
  - `findOne → await findOneAsync`
  - `insert / update / upsert / remove → await *Async`
  - Cursors: `count / fetch / forEach / map → *Async`
  - `Meteor.call → await Meteor.callAsync`
  - `Meteor.user() → await Meteor.userAsync()`
  - Generic `cb(err, res)` → `await` via `Meteor.promisify` (where helpful)
- 🧠 **Scope-aware**: adds `async` to the nearest function, or uses `.then/.catch` if you prefer
- 🧹 **Formatting**: optional Prettier + ESLint `--fix` pass
- 🧪 **Dry runs** and HTML **reports** of every change
- 🛟 **Git guardrails**: initializes a repo if missing, branches, and commits after each stage
- 🧩 **Plugin architecture**: write your own codemods with Babel/jscodeshift or TypeScript (ts-morph)
- 🧭 **Opinionated, configurable**: choose await vs then/catch, include/exclude globs, top-level await policy, and more

---

## TL;DR

```bash
# Try it in dry-run mode first
npx meteor-upgrade-to-3 --dry

# Apply transforms and review a report
npx meteor-upgrade-to-3 --write --report

# Common setup: format, lint, and commit
npx meteor-upgrade-to-3 --write --format --lint-fix --commit
```

---

## Project Setup & Development

### Prerequisites

- Node.js 14+ 
- npm or yarn

### Installation

For global installation:
```bash
npm install -g meteor-upgrade-to-3
```

For project-specific usage:
```bash
npx meteor-upgrade-to-3 --help
```

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/wreiske/meteor-upgrade-to-3.git
cd meteor-upgrade-to-3
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run in development mode:
```bash
npm run dev  # Watches for changes and rebuilds
```

5. Test the CLI:
```bash
./bin/meteor-upgrade-to-3.js --help
```

### Architecture

The CLI is built with:

- **TypeScript** for type safety and better developer experience
- **Commander.js** for CLI argument parsing and commands
- **jscodeshift** for AST-based code transformations
- **ts-morph** as an alternative transformation engine (planned)
- **Simple Git** for git operations and guardrails
- **Plugin system** for extensible transformations

### Plugin Architecture

The tool uses a plugin-based architecture where each transformation is implemented as a separate plugin:

```typescript
import { BasePlugin } from './types';
import { Transform } from 'jscodeshift';

export class MyCustomPlugin extends BasePlugin {
  name = 'my-custom-transform';
  description = 'Transform X to Y';
  
  transform: Transform = (fileInfo, api, options) => {
    // Your transformation logic here
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    
    // ... perform transformations
    
    return root.toSource();
  };
}
```

### Available Transforms

The CLI includes these built-in transform plugins:

- **async-api**: Collection methods (`findOne` → `findOneAsync`, etc.)
- **cursor-async**: Cursor methods (`count` → `countAsync`, etc.)
- **meteor-call-async**: `Meteor.call` → `Meteor.callAsync`
- **meteor-user-async**: `Meteor.user` → `Meteor.userAsync`
- **callback-to-await**: Callback patterns → `async/await` (planned)

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

### Testing

Run the test suite:
```bash
npm test
```

Run linting:
```bash
npm run lint
npm run lint:fix
```

Format code:
```bash
npm run format
```

---

## Design Decisions

- **TypeScript**: Chosen for better type safety, IntelliSense, and maintainability
- **Plugin Architecture**: Enables extensibility and separation of concerns
- **AST-based Transformations**: Using jscodeshift for safe, precise code modifications
- **Git Integration**: Built-in branching and committing for safe, reviewable changes
- **Dry-run First**: Encourages safe usage with preview capabilities
- **HTML Reports**: Visual feedback on what changes were made
- **Configurable**: Flexible options for different migration strategies
