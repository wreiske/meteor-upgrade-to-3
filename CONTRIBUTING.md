# Contributing to meteor-upgrade-to-3

🎉 **Thank you for your interest in contributing to meteor-upgrade-to-3!** 🎉

We warmly welcome contributions from the community! This project helps developers migrate from Meteor 2.x to 3.x by automating the transition from Fibers to async/await, and we'd love your help making it even better.

Whether you're fixing bugs, adding new migration features, improving documentation, or suggesting enhancements, every contribution makes a difference. We believe that collaborative development makes for better tools, and we're excited to work with you!

## 🚀 How You Can Help

We're actively looking for contributors to help with:

- **Building new migration features and improvements** - Add support for new Meteor 3.x APIs or patterns
- **Enhancing existing codemods** - Improve the accuracy and coverage of current transformations
- **Bug fixes** - Help identify and resolve issues in the migration process
- **Documentation** - Improve guides, examples, and API documentation
- **Testing** - Add test cases, improve test coverage, or help with manual testing
- **Performance optimizations** - Make the migration process faster and more efficient

## 🏃‍♂️ Getting Started

### Prerequisites

- **Node.js 14+** (we recommend using the latest LTS version)
- **npm** or **yarn**
- **Git** for version control
- Basic understanding of **TypeScript** and **AST transformations** (helpful but not required)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/meteor-upgrade-to-3.git
   cd meteor-upgrade-to-3
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Test the CLI**:
   ```bash
   ./bin/meteor-upgrade-to-3.js --help
   ```

6. **Start development mode** (watches for changes and rebuilds):
   ```bash
   npm run dev
   ```

### Understanding the Project Structure

- **`src/`** - TypeScript source code
  - **`cli.ts`** - Command-line interface and argument parsing
  - **`upgrader.ts`** - Main migration engine and orchestration
  - **`plugins/`** - Individual transformation plugins
  - **`config.ts`** - Configuration and default settings
- **`bin/`** - Executable CLI entry point
- **`__tests__/`** - Test files (to be added)

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm run build
   npm run lint
   npm run test
   ```

4. **Test the CLI manually** on sample Meteor projects

5. **Commit your changes** with descriptive commit messages

6. **Push to your fork** and **create a pull request**

## 📝 Contributing Guidelines

### For Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the bug
- **Expected vs. actual behavior**
- **Sample code** that demonstrates the problem
- **Environment details** (Node.js version, OS, Meteor version)
- **CLI command** you ran and any relevant options

**Use our bug report template:**
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happened

## Environment
- Node.js version:
- OS:
- Meteor version:
- CLI command used:

## Sample Code
```js
// Paste relevant code here
```

### For Feature Requests

We love new ideas! When suggesting features:

- **Explain the use case** - why would this be helpful?
- **Describe the proposed solution** - what should it do?
- **Consider alternatives** - are there other ways to solve this?
- **Provide examples** - show what the transformation should look like

### For Pull Requests

#### Before You Start

- **Check existing issues** to see if someone is already working on it
- **Open an issue first** for significant changes to discuss the approach
- **Keep changes focused** - one feature/fix per PR

#### Code Standards

- **Follow TypeScript best practices**
- **Use ESLint configuration** - run `npm run lint:fix` before committing
- **Format code with Prettier** - run `npm run format` before committing
- **Write descriptive commit messages** following [Conventional Commits](https://conventionalcommits.org/)

#### Pull Request Process

1. **Update documentation** if you're changing behavior
2. **Add tests** for new functionality (when test infrastructure exists)
3. **Ensure all checks pass**:
   ```bash
   npm run check-all  # Runs lint, format check, and build
   ```
4. **Write a clear PR description** explaining:
   - What changes you made
   - Why you made them
   - How to test the changes
   - Any breaking changes or migration notes

5. **Be responsive** to code review feedback

## 🔧 Building New Migration Features

### Plugin Architecture

The tool uses a plugin-based architecture. Each transformation is implemented as a separate plugin:

```typescript
import { BasePlugin } from './types';
import { Transform } from 'jscodeshift';

export class MyCustomPlugin extends BasePlugin {
  name = 'my-custom-transform';
  description = 'Transform X to Y';
  
  transform: Transform = (fileInfo, api, options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    
    // Your transformation logic here
    
    return root.toSource();
  };
}
```

### Current Transform Plugins

- **async-api**: Collection methods (`findOne` → `findOneAsync`, etc.)
- **cursor-async**: Cursor methods (`count` → `countAsync`, etc.)  
- **meteor-call-async**: `Meteor.call` → `Meteor.callAsync`
- **meteor-user-async**: `Meteor.user` → `Meteor.userAsync`
- **callback-to-await**: Callback patterns → `async/await` (planned)

### Adding New Transformations

1. **Identify the pattern** you want to transform
2. **Create a new plugin** in the appropriate directory
3. **Write transformation logic** using jscodeshift or ts-morph
4. **Add configuration options** if needed
5. **Register the plugin** in the main upgrader
6. **Test thoroughly** with various code patterns
7. **Document the transformation** in README and comments

### Testing Your Plugin

- **Create test cases** with before/after code examples
- **Test edge cases** - nested functions, different syntaxes, etc.
- **Verify the plugin doesn't break** existing functionality
- **Test on real Meteor projects** to ensure practical utility

## 💬 Community and Communication

- **GitHub Issues** - For bug reports, feature requests, and discussions
- **Pull Request Reviews** - We strive to review PRs within a few days
- **Be respectful and constructive** in all interactions

## 📄 License

By contributing to meteor-upgrade-to-3, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers the project.

---

## 🙏 Thank You!

Every contribution, no matter how small, helps make the Meteor ecosystem better for everyone. We appreciate you taking the time to contribute to this project!

If you have any questions about contributing, feel free to open an issue with the `question` label, and we'll be happy to help get you started.

**Happy coding! 🚀**