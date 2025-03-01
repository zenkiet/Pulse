# Contributing to ProxMox Pulse

Thank you for considering contributing to ProxMox Pulse! This document outlines the process for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers understand your report, reproduce the behavior, and find related reports.

Before creating bug reports, please check [the issue list](https://github.com/rcourtman/pulse/issues) as you might find that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem.
* **If the problem is related to performance or memory**, include a CPU profile capture with your report.
* **If the problem wasn't triggered by a specific action**, describe what you were doing before the problem happened.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets which you use in those examples.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Include screenshots and animated GIFs** which help you demonstrate the steps or point out the part of ProxMox Pulse which the suggestion is related to.
* **Explain why this enhancement would be useful** to most ProxMox Pulse users.
* **List some other applications where this enhancement exists.**

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Include screenshots and animated GIFs in your pull request whenever possible
* Follow the JavaScript/TypeScript styleguide
* Include adequate tests
* Document new code
* End all files with a newline

## Development Process

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/pulse.git`
3. Install dependencies: `npm install`
4. Install frontend dependencies: `cd frontend && npm install`
5. Create a `.env` file based on the `.env.example` file
6. Run the application: `npm run pulse`

### Coding Style

* Use 2 spaces for indentation
* Use camelCase for variables and functions
* Use PascalCase for classes and components
* Use UPPERCASE for constants
* Add comments for complex logic

### Testing

* Write tests for new features
* Ensure all tests pass before submitting a pull request
* Run tests with `npm test`

### Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

## License

By contributing to ProxMox Pulse, you agree that your contributions will be licensed under the project's [MIT License](LICENSE). 