# Contributing to Dictionary MCP Server

Thank you for considering contributing to Dictionary MCP.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct: be respectful, inclusive, and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Please check existing issues to avoid duplicates.

When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Your environment details (OS, Bun version, etc.)
- Any relevant logs or error messages

### Suggesting Enhancements

Please provide:

- A clear and descriptive title
- A detailed description of the proposed feature
- Why this enhancement would be useful
- Any examples of how it might work

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add or update tests as needed
5. Ensure all tests pass (`bun test`)
6. Check types (`bun run typecheck`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to your branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/dictionary-mcp.git
cd dictionary-mcp

# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests
bun test

# Type checking
bun run typecheck
```

## Testing

- Write tests for any new functionality
- Ensure all existing tests pass
- Aim for good test coverage
- Test files should be named `*.test.ts`

## Code Style

- Use TypeScript for all code
- Follow the existing code style
- No `any` types without good reason
- Keep functions small and focused
- Use meaningful variable and function names

## Commit Messages

- Use clear and meaningful commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 72 characters
- Reference issues when applicable

## Documentation

- Update README.md if adding new features
- Include examples for new functionality
- Keep documentation clear and concise

## Questions?

Feel free to open an issue for any questions about contributing!

Thank you for contributing! 🎉
