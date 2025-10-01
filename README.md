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
  - `alanning:roles → meteor/roles` with async API
  - Generic `cb(err, res)` → `await` via `Meteor.promisify` (where helpful)
- 📦 **Package compatibility analysis**: automatically detects your packages and provides Meteor 3 migration guidance
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
- **roles-migration**: `alanning:roles` → `meteor/roles` with async API
- **callback-to-await**: Callback patterns → `async/await` (planned)

### Package Migration Mapping

The tool includes a comprehensive package mapping system that analyzes your project's dependencies and provides migration guidance for Meteor 3 compatibility. This feature automatically detects packages in your `package.json` and `.meteor/packages` files and provides status information and migration suggestions.

#### Package Status Types

- **ok**: Package works with Meteor 3 without changes
- **legacy**: Package may need updates but should work
- **deprecated**: Package is no longer maintained
- **replaced**: Package has been superseded or integrated into Meteor core
- **incompatible**: Package will not work with Meteor 3

#### Package Mapping File Format

The `package-mapping.json` file in the repository root contains verified migration information for well-known packages:

```json
{
  "version": "1.0.0",
  "packages": {
    "alanning:roles": {
      "status": "replaced",
      "suggest": ["meteor/roles"],
      "notes": "Built into Meteor 3 core. Update imports from 'meteor/alanning:roles' to 'meteor/roles' and use async versions of methods.",
      "migrationComplexity": "medium",
      "automaticMigration": true,
      "category": "authentication"
    },
    "some-package:example": {
      "status": "legacy",
      "suggest": [],
      "versionBump": "2.1.0",
      "notes": "Requires version 2.1.0+ for Meteor 3 compatibility. Update to the latest version.",
      "migrationComplexity": "low",
      "automaticMigration": false,
      "category": "other"
    }
  }
}
```

#### Contributing Package Mappings

**Important**: Only add packages with verified Meteor 3 compatibility information. Do not make assumptions about package compatibility.

To contribute package migration information:

1. **Verify compatibility** by testing the package with Meteor 3
2. **Add or update entries** in `package-mapping.json` only for confirmed cases
3. **Follow the schema** defined in `package-mapping.schema.json`
4. **Test your changes** by running the tool on a project that uses the packages
5. **Include these fields** for each package:
   - `status`: Current compatibility status
   - `suggest`: Array of recommended alternatives (empty if just needs version bump)
   - `versionBump`: Minimum version required for Meteor 3 (optional)
   - `notes`: Migration guidance and context
   - `migrationComplexity`: "low", "medium", or "high"
   - `automaticMigration`: Whether automatic migration is available
   - `category`: Package category for organization

#### CLI Options

- `--no-package-mapping`: Disable package mapping analysis
- `--package-mapping-path <path>`: Use a custom package mapping file

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## Releasing & Publishing

### For Maintainers

This project uses automated npm publishing via GitHub Actions. To create a new release:

1. **Ensure main branch is ready for release:**
   ```bash
   npm run check-all  # Verify all quality checks pass
   npm test           # Ensure all tests pass
   ```

2. **Create and push a version tag:**
   ```bash
   git tag v1.2.3     # Replace with desired version
   git push origin v1.2.3
   ```

3. **Automated publishing process:**
   - GitHub Actions workflow triggers on the version tag
   - Runs comprehensive pre-publish checks (build, test, lint)
   - Automatically updates package.json version from git tag
   - Publishes to npm with provenance for supply chain security
   - Creates release summary with installation instructions

4. **NPM Token Setup:**
   - Repository requires `NPM_TOKEN` secret in GitHub Actions
   - Token should have publish permissions for the `meteor-upgrade-to-3` package
   - Configure in repository Settings → Secrets and Variables → Actions

### Version Numbering

Follow semantic versioning (semver):
- **Major (v2.0.0)**: Breaking changes
- **Minor (v1.1.0)**: New features, backward compatible
- **Patch (v1.0.1)**: Bug fixes, backward compatible

### Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

Watch mode for development:
```bash
npm run test:watch
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

Run all quality checks:
```bash
npm run check-all
```

## Continuous Integration

This project uses GitHub Actions to ensure code quality and consistency:

### Automated Checks

Every push and pull request triggers:

- **Tests**: Comprehensive unit tests covering all major functionality (74+ tests)
- **Linting**: ESLint checks for code quality and consistency
- **Formatting**: Prettier checks for consistent code formatting
- **Building**: TypeScript compilation and build verification
- **Security**: npm audit and CodeQL analysis
- **Type Coverage**: TypeScript coverage analysis

### Workflows

- **CI Workflow** (`.github/workflows/ci.yml`): 
  - Runs on Node.js 18.x and 20.x
  - Tests, linting, formatting, and build checks
  - Uploads coverage reports to Codecov

- **PR Checks** (`.github/workflows/pr-checks.yml`):
  - Quality gate for pull requests
  - Coverage reporting and comments
  - Dependency review for security
  - Commit message validation

- **Code Quality** (`.github/workflows/code-quality.yml`):
  - Security audits with npm audit
  - CodeQL analysis for vulnerability detection
  - TypeScript coverage reporting
  - Detailed linting reports with annotations

- **NPM Publish** (`.github/workflows/npm-publish.yml`):
  - Automated publishing on release tags (v*)
  - Pre-publish quality gates (build, test, lint)
  - Automatic version synchronization from git tags
  - NPM provenance for supply chain security

### Quality Gates

Pull requests must pass:

✅ All unit tests (74+ tests)  
✅ ESLint checks with zero warnings  
✅ Prettier formatting validation  
✅ TypeScript compilation  
✅ Security audit (moderate+ vulnerabilities)  
✅ Dependency review  

### Coverage Reports

- Test coverage reports are automatically generated and commented on PRs
- Coverage data is uploaded to Codecov for tracking over time
- Type coverage ensures robust TypeScript usage

---

## Design Decisions

- **TypeScript**: Chosen for better type safety, IntelliSense, and maintainability
- **Plugin Architecture**: Enables extensibility and separation of concerns
- **AST-based Transformations**: Using jscodeshift for safe, precise code modifications
- **Git Integration**: Built-in branching and committing for safe, reviewable changes
- **Dry-run First**: Encourages safe usage with preview capabilities
- **HTML Reports**: Visual feedback on what changes were made
- **Configurable**: Flexible options for different migration strategies
