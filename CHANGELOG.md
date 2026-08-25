# Changelog

All notable project changes are documented here.

## [1.1.0] - 2026-08-26

### Added

- Modern popup interface with pass, warning, and fail states.
- Dedicated documentation for installation, architecture, validation logic, security, and limitations.
- Repository contribution guide, issue templates, pull request template, and lightweight validation workflow.
- Support for standard single-label wildcard SAN matching.
- Additional displayed connection details, including key exchange group and Encrypted ClientHello when Chrome reports them.

### Changed

- Reduced extension permissions to `activeTab` and `debugger`.
- Reworked the overall result wording so it does not claim independent PKI verification.
- Renamed and documented Certificate Transparency checks correctly instead of treating CT compliance as trusted-root validation.
- Limited capture to the main document response and added timeout/cleanup handling for debugger sessions.
- Replaced string-built certificate result HTML with DOM rendering through `textContent`.
- Moved extension source into the `extension/` directory.
- Replaced the original short README with portfolio-oriented documentation.

### Removed

- Committed IDE metadata.
- Duplicate README/setup files.
- The repository archive copy (`.rar`).
- Unused `scripting`, `tabs`, `webRequest`, and persistent `<all_urls>` permissions.
