# Changelog

All notable changes to `@trustline.id/websdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-10-06

### Documentation

- Expanded the Stellar structured-data documentation with explicit Soroban type mappings,
  canonical intent-data rules, nested collection examples, and fully typed function prototypes.

## [1.1.0] - 2026-09-28

### Added

- Stellar and Soroban intent support for the existing Web3 `validate()` flow.
- Documentation for Stellar account and contract addresses, Trustline Stellar chain IDs,
  stroop-denominated values, canonical intent bytes, and structured Soroban calls.
- Stellar examples showing how a dApp pre-validates an intent before signing and submitting it
  with a Stellar wallet.

### Changed

- Aligned approved validation responses with the backend API:
  - renamed `partialCert` to `attestation`;
  - made `policyHash` required;
  - made `signature` optional because it is only returned for EVM validations.
- Improved `openSession()` error propagation so backend error messages are preserved.

## [1.0.2] - 2026-02-11

### Fixed

- Corrected policy-configuration request handling.

### Documentation

- Added JSDoc comments to the public TypeScript API.
- Added the MIT license.

## [1.0.1] - 2026-02-02

### Added

- Session-based validation with automatic authentication when required.
- Popup and iframe authentication flows, including JWT hand-off to the validation request.
- Validation modes for dApps and supported protocol integrations.
- Policy-management methods:
  - `configurePolicy()`;
  - `fetchPolicy()`;
  - `fetchDefaultPolicy()`.
- Typed session, policy, EIP-712 signing, and authentication payloads.
- Optional JWT input for `validate()`.
- `authRequired` handling in session responses.

### Changed

- Made `openSession()` an internal implementation detail of the validation flow.
- Aligned session and validation payloads with the backend API.
- Expanded the README with complete API and integration examples.

## [1.0.0] - 2025-09-11

### Added

- Initial public release of `@trustline.id/websdk`.
- Web3 and Web2 validation through `trustline.validate()`.
- SDK initialization through JavaScript options or DOM data attributes.
- Approved, rejected, approval-required, and error response types.
- TypeScript declarations and CommonJS, ES module, and UMD builds.

[Unreleased]: https://github.com/TrustLine-id/websdk/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/TrustLine-id/websdk/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/TrustLine-id/websdk/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/TrustLine-id/websdk/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/TrustLine-id/websdk/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/TrustLine-id/websdk/releases/tag/v1.0.0
