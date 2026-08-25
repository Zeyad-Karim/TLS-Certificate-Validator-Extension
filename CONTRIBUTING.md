# Contributing

Thanks for your interest in improving TLS Certificate Validator.

## Getting Started

1. Fork the repository or create a feature branch.
2. Load `extension/` as an unpacked extension from `chrome://extensions/`.
3. Make your changes.
4. Reload the extension from the extensions page.
5. Test on at least one normal HTTPS page and one expected error case.

## Development Guidelines

- Keep the extension dependency-free unless a dependency clearly improves maintainability or security.
- Request the minimum Chrome permissions needed for a feature.
- Treat TLS and certificate fields as untrusted display data; prefer DOM APIs and `textContent` over string-built HTML.
- Keep validation wording precise. Avoid calling Certificate Transparency compliance "root trust" or claiming that the extension independently verifies the entire PKI chain.
- Preserve accessibility basics such as keyboard focus states, readable contrast, and reduced-motion behavior.
- Update documentation when behavior, permissions, or validation logic changes.

## Before Opening a Pull Request

- Confirm `extension/manifest.json` is valid JSON.
- Run JavaScript syntax checks:

```bash
node --check extension/background.js
node --check extension/popup.js
```

- Reload the unpacked extension in Chrome and run a manual inspection.
- Review the PR diff for accidental IDE files, archives, or generated artifacts.

## Pull Requests

Keep pull requests focused and describe:

- what changed;
- why the change is useful;
- how it was tested; and
- any security or permission implications.
