# Change Log

All notable changes to the "API Designer" extension will be documented in this file.

> Note: No public release has been published yet. Entries are tracked under `Unreleased`.

## **Unreleased**

### Changed

- Simplified extension scope to OpenAPI-focused design and analysis flows.
- Removed legacy/custom-agent bootstrap behavior from extension activation.
- Removed project-specific `.api-platform/config.yaml` governance ruleset resolution (default ruleset flow now used).
- Reduced noisy diagnostics and added targeted debug telemetry for agent-based AI readiness lifecycle.
- Added remote ruleset content caching for dynamic Spectral validation to reduce repeated downloads.

### Added

- Schema editor support for importing JSON samples and generating schema definitions directly.
- Enhanced stale AI readiness behavior:
  - stale findings remain visible from latest cached ready result,
  - stale state now shows last evaluation timestamp.

### Fixed

- Fixed operation edits not persisting for newly added empty operations (e.g., `post: {}`).
- Fixed stale AI readiness issue loading when spec hash changes by reusing latest cached ready findings.
- Improved Analyze Issue Explorer visuals:
  - `hint` severity now uses blue left border,
  - re-evaluate button visibility improved.

