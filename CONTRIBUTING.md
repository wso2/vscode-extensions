# Contributing to WSO2 VSCode Extensions Monorepo

Thank you for your interest in contributing! We welcome contributions from the community to improve our Visual Studio Code extensions and supporting libraries.

---

## How to Contribute

1. **Fork the Repository**  
   Click the "Fork" button on GitHub and clone your fork locally.

2. **Create a Branch**  
   Create a new branch for your feature, bugfix, or improvement:
   ```bash
   git checkout -b my-feature-branch
   ```

3. **Install Dependencies**  
   Use [Rush](https://rushjs.io/) for dependency management:
   ```bash
   rush install
   ```

4. **Set Up Environment Variables**  
   Some extensions require a `.env` file. Copy `.env.example` to `.env` in the relevant extension directory and fill in the required values.

5. **Make Your Changes**  
   Follow the code style and structure of the project. Add tests if applicable.

6. **Build and Test**  
   Build and test your changes using Rush:
   ```bash
   rush build
   rush test
   ```

7. **Commit and Push**  
   Commit your changes with a clear message and push your branch to your fork.

8. **Open a Pull Request**  
   Go to the main repository and open a pull request from your branch. Describe your changes and reference any related issues.

---

## Guidelines

- **Follow the directory structure** as described in `SOURCE_ORG.md`.
- **Use Rush commands** for all dependency and build operations.
- **Write clear commit messages** and PR descriptions.
- **Add or update tests** for your changes.
- **Ensure your code passes linting and CI checks.**
- **Do not commit sensitive information** (such as secrets or credentials).

---

## Reporting Issues

- Use the [issue templates](.github/ISSUE_TEMPLATE) for bug reports, feature requests, improvements, questions, or tasks.
- Provide as much detail as possible, including steps to reproduce, environment, and screenshots if applicable.

---

## Community & Support

- For questions, open an issue or visit our [community page](https://wso2.com/community/).
- Please review our [Code of Conduct](https://github.com/wso2/code-of-conduct) before contributing.

---

Thank you for helping us make WSO2 VSCode Extensions better!
