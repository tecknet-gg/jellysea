# Contributing

Guide for contributing to Recyclarr config templates.

## Overview

This repository contains configuration templates for
[Recyclarr](https://github.com/recyclarr/recyclarr), providing ready-to-use configurations that sync
TRaSH Guides recommendations to Radarr/Sonarr.

## Template System

Two-tier structure with registry files at the root:

- `templates.json` - Maps template IDs to top-level files (user-facing entry points)
- `includes.json` - Maps include IDs to reusable components

Top-level templates reference includes via `include:` directive using IDs from `includes.json`.

```txt
radarr/
  templates/           # Top-level templates (referenced in templates.json)
  includes/
    custom-formats/    # Custom format definitions
    quality-definitions/
    quality-profiles/
    sqp/               # Special Quality Profiles (storage-optimized)

sonarr/
  templates/           # Top-level templates for Sonarr v4
  includes/
    custom-formats/
    quality-definitions/
    quality-profiles/
```

## File Requirements

### Naming Convention

Templates: `{resolution}-{source}-{language-variant}.yml`

- Resolution: `hd` (1080p), `uhd` (2160p)
- Source: `bluray-web`, `remux-web`, `web`
- Language variants: `french-vostfr`, `french-multi-vf`, `french-multi-vo`, `german`
- SQP templates: `sqp-{1-5}` for size-quality balanced profiles

### Header Format

All templates must include a header comment block:

```yaml
###################################################################################################
# Recyclarr Configuration Template: {Template Name}                                               #
# Updated: YYYY-MM-DD                                                                             #
# Documentation: https://recyclarr.dev                                                            #
###################################################################################################
```

- `Updated:` date is required and must be current when modifying a template
- CI will fail if the date is missing or stale on PRs

## Local Testing

Install [Python 3](https://www.python.org/downloads/) and
[yamllint](https://yamllint.readthedocs.io/en/stable/quickstart.html#installing-yamllint), then run:

```bash
yamllint .
```

On Windows, set `PYTHONUTF8=1` to avoid false line-length errors on files with unicode characters.
See [yamllint#530](https://github.com/adrienverge/yamllint/issues/530#issuecomment-1402452147).

## CI Checks

PRs are validated by:

- `yaml-lint.yml` - YAML syntax
- `check-paths.yml` - Paths in `templates.json`/`includes.json` exist
- `check-trash-ids.yml` - Trash IDs are valid against TRaSH-Guides
- `check-dates.yml` - `Updated:` dates are present in headers

## Commit Conventions

Commits with `feat:` or `fix:` trigger Discord notifications. Choose types carefully.

### Type Selection

- `feat:` - New templates, includes, or registry entries
- `fix:` - Modifications to existing template/include files
- `docs:` - Markdown files, LICENSE
- `ci:` - Workflow files
- `chore:` - Everything else

### Scopes

- `(radarr)` - Changes under `radarr/`
- `(sonarr)` - Changes under `sonarr/`
- `(config)` - Changes to `templates.json` or `includes.json`

### Breaking Changes

Add `!` suffix for breaking changes:

- Template or include ID renames/removals
- Schema changes requiring user config updates

Example: `feat(radarr)!: rename hd-bluray-web template`

## Branching Strategy

Config-templates uses version-aware branches to maintain compatibility across Recyclarr major
versions.

### Branch Structure

- `v{major}` branches (e.g., `v8`, `v9`): Templates for specific Recyclarr major versions
- `master`: Fallback branch, serves older versions without a dedicated branch

### How Recyclarr Selects Branches

Recyclarr automatically selects the appropriate branch:

1. Tries `v{major}` matching its version (e.g., Recyclarr 8.x tries `v8`)
2. Falls back to `master`, then `main`

Users can override with explicit `reference` in `settings.yml`.

### Which Branch to Target

- **New features**: Target `v{major}` for current/upcoming Recyclarr release
- **Critical fixes for older versions**: May be applied to `master` on a case-by-case basis

### Support Policy

Template maintainers are not expected to backport updates or maintain multiple versions. Users on
older Recyclarr versions experiencing template drift should upgrade.

### Creating a New Version Branch

When a new Recyclarr major version releases:

1. Create `v{new}` from the previous version branch (or `master` if none exists)
2. Previous branch enters maintenance mode (critical fixes only)

Example for v9: create `v9` from `v8`, then `v8` becomes maintenance-only.
