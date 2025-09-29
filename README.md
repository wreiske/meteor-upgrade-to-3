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
