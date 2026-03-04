# Contributing to Bus Route Optimizer

Thank you for your interest in contributing to the Bus Route Optimizer project! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

We are committed to providing a welcoming and inspiring community. Please read and follow our Code of Conduct.

## 📋 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/your-username/bus-route-optimizer.git
   cd bus-route-optimizer
   ```
3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original-org/bus-route-optimizer.git
   ```
4. **Install dependencies**
   ```bash
   npm install
   ```
5. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🔄 Workflow

### Making Changes

1. **Keep your fork in sync**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Install pre-commit hooks** (optional but recommended)
   ```bash
   npm run setup:hooks
   ```

3. **Make your changes** and test thoroughly
   ```bash
   npm start         # Run development server
   npm test          # Run unit tests
   npm run build     # Build for production
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no logic change)
- `refactor:` Code restructuring (no feature change)
- `test:` Adding or updating tests
- `chore:` Build/dependency updates

**Example:**
```
feat(trip-planner): add route comparison feature

Implements side-by-side route comparison with travel time,
transfers, and walk distance metrics.

Closes #123
```

### Pushing and Creating a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub
   - Provide a clear description of changes
   - Reference related issues (Closes #123)
   - Include screenshots/videos for UI changes
   - Ensure CI/CD checks pass

## ✅ Code Quality Standards

- **ESLint**: Run `npm run lint` to check code style
- **Prettier**: Run `npm run format` to auto-format code
- **Tests**: Maintain >80% code coverage
- **TypeScript**: Use TypeScript for type safety (where applicable)
- **React**: Follow React best practices and hooks patterns

## 🧪 Testing

Write tests for:
- New features
- Bug fixes
- Edge cases

```bash
npm test                    # Run all tests
npm test -- --coverage      # Generate coverage report
npm test -- --watch         # Watch mode
```

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for functions/components
- Include architecture diagrams for major changes
- Update CHANGELOG.md

## 🚀 Performance

- Check bundle size impact
- Avoid unnecessary re-renders in React components
- Profile with React DevTools
- Test on slower devices/networks

## 🔒 Security

- Never commit secrets (API keys, tokens)
- Use `.env.example` for environment variable templates
- Run security audits: `npm audit`
- Report security issues privately to maintainers

## 📝 Review Process

1. Code review by maintainers
2. Address feedback and push updates
3. Get approval from 2+ maintainers
4. Squash and merge to main

## 🐛 Reporting Bugs

Submit issues on GitHub with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/Node version
- Screenshots/logs if applicable

## 💡 Suggesting Features

Discuss new features in:
- GitHub Discussions
- Create an issue with `[RFC]` prefix
- Include motivation and use cases

## 📖 Additional Resources

- [React Documentation](https://react.dev)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow Guide](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Project Architecture](./docs/ARCHITECTURE.md)

## ❓ Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Contact maintainers via email

Thank you for contributing! 🎉
