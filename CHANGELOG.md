# Changelog

All notable changes to Sales Channel Snippets will be documented in this file.

This project follows semantic versioning.

## [0.1.0] - 2026-06-08

### Added

- Initial Shopware 6 plugin structure.
- Custom `sales_channel_snippet` entity and database migration.
- Administration module for managing snippet overrides by sales channel and language.
- Storefront translator decorator for sales-channel-specific snippet values.
- Cache invalidation for sales channel snippet writes.
- Plugin icon.
- MIT license and contribution guide.

### Fixed

- Avoided a circular dependency in the translator decorator by using a direct DBAL lookup instead of injecting the custom DAL repository.
