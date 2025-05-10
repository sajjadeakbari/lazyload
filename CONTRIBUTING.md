# Contributing to LazyLoad Plus

First off, thank you for considering contributing to LazyLoad Plus! We appreciate your time and effort. Your contributions help make this project better for everyone.

This document provides a set of guidelines for contributing to LazyLoad Plus. These are mostly guidelines, not strict rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## How Can I Contribute?

There are many ways you can contribute:

-   **Reporting Bugs**: If you find a bug, please report it by opening an issue. Include as much detail as possible: steps to reproduce, browser versions, expected behavior, and actual behavior.
-   **Suggesting Enhancements**: If you have an idea for a new feature or an improvement to an existing one, open an issue to discuss it.
-   **Writing Code**: You can pick an existing issue (especially those labeled `help wanted` or `good first issue`) or propose a new feature and implement it.
-   **Improving Documentation**: Good documentation is crucial. If you find parts of the documentation unclear or missing, please help improve it. This includes the `README.md`, inline code comments, and generated API docs.
-   **Writing Tests**: We aim for good test coverage. Adding new tests or improving existing ones is a great way to contribute.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally: `git clone https://github.com/YOUR_USERNAME/lazyload-plus.git`
3.  **Set up the project**:
    ```bash
    cd lazyload-plus
    npm install
    ```
4.  **Create a new branch** for your changes: `git checkout -b feature/your-amazing-feature` or `fix/issue-number`.
5.  **Make your changes**. Follow the [Code Style](#code-style) guidelines.
6.  **Test your changes**:
    -   Run linters: `npm run lint` (and `npm run lint:fix` to auto-fix)
    -   Run tests: `npm run test`
    -   Build the project: `npm run build:prod`
7.  **Commit your changes**: Write clear, concise commit messages. We loosely follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. For example:
    -   `feat: Add support for AVIF images`
    -   `fix: Correctly handle empty data-src attribute`
    -   `docs: Update README with new API method`
    -   `refactor: Improve performance of element iteration`
    -   `test: Add unit tests for callback_error`
8.  **Push your branch** to your fork: `git push origin feature/your-amazing-feature`
9.  **Open a Pull Request (PR)** to the `main` branch of the `sajjadeakbari/lazyload-plus` repository.
    -   Provide a clear title and description for your PR.
    -   Link to any relevant issues (e.g., "Closes #123").
    -   Ensure all CI checks pass.

## Code Style

-   **JavaScript/TypeScript**: We use Prettier for code formatting and ESLint for linting. Please run `npm run prettier:fix` and `npm run lint:fix` before committing. Configuration files are in the repository (`.prettierrc.js`, `.eslintrc.js`).
-   **Comments**: Write clear and concise comments where necessary, especially for complex logic or public APIs (JSDoc style for public methods).
-   **Simplicity**: Keep code simple and easy to understand.

## Pull Request Process

1.  We will review your PR as soon as possible.
2.  We may ask for changes or provide feedback. Please be responsive to comments.
3.  Once the PR is approved and all checks pass, it will be merged.

## Code of Conduct

This project and everyone participating in it is governed by a [Code of Conduct](CODE_OF_CONDUCT.md) (You will need to create this file, e.g., based on the Contributor Covenant). By participating, you are expected to uphold this code. Please report unacceptable behavior.

## Questions?

If you have any questions, feel free to open an issue or reach out to Sajjad Akbari.

Thank you for contributing!
