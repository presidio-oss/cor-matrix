# Contributing to COR-Matrix

Thank you for your interest in contributing to COR-Matrix! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment:
   ```bash
   bun install
   cp .env.example .env
   # Edit .env with your configuration
   bun run db:push
   ```

## Development Workflow

1. Create a new branch for your feature/fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test them:

   ```bash
   bun run dev:api        # Test API changes
   bun run build:client   # Test client changes
   ```

3. Commit your changes with a clear message:

   ```bash
   git commit -m "feat: add new feature description"
   ```

4. Push to your fork and create a pull request

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting (we use Prettier)
- Add tests for new functionality
- Update documentation as needed

## Pull Request Process

1. Ensure your code builds without errors
2. Update the README if you've changed functionality
3. Add tests for new features
4. Ensure all tests pass
5. Request review from maintainers

## Reporting Issues

- Use GitHub Issues to report bugs
- Include steps to reproduce the issue
- Provide system information and error messages
- Check existing issues before creating new ones

## Questions?

Feel free to open an issue for questions or reach out to the maintainers.
