# Changelog

All notable user-facing changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once we cut our first tagged release.

## [Unreleased]

### Added
- Marketing landing page redesign with cyan/violet aesthetic, demo video slot, and a hosted-vs-self-host CTA pair.
- Onboarding flow at `/dashboard/connect` — auto-generated default API key on first visit, pre-filled MCP config snippets, and a self-contained curl test command.
- Sticky dashboard navigation with mobile hamburger, GitHub + Discord links.
- Marketing layout and dashboard layout with footers (Terms · Privacy · Discord · GitHub).
- Open Graph and Twitter card meta tags across pages, with a dedicated `/og.jpg` image and per-page overrides on the public asset viewer.
- Version-aware comments — comments are now scoped to the asset version they were made on, so pins don't drift across revisions. New `read_asset_comments` MCP tool with optional `since_version` filter.
- System emails via AWS SES (sesv2) with MJML templates and CID-attached logo: welcome, password reset, workspace invitation, asset-shared.
- Forgot-password flow at `/forgot-password` and `/reset-password?token=...` with hashed tokens and 60-minute TTL.
- Email-based workspace invitations with 72-hour expiry, lazy expiration, accept/decline, and auto-accept on register-via-invite.
- Per-field form validation rendering on auth pages.
- "Share asset" feature: copy link, X/LinkedIn/WhatsApp social share, native Web Share API where supported, and email-send with optional note. Available from the dashboard asset cards and the public asset viewer top bar.
- Open-source baseline: README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue/PR templates, dependabot config.

### Changed
- Hero gradient now bleeds through the transparent home-page nav until scroll, then morphs into a blurred zinc backdrop.
- Asset cards in the dashboard use the same gradient-border treatment as the marketing loop section.
- Dashboard nav role colors aligned to the brand palette (OWNER cyan, WRITE violet, READ zinc).
- Comments toggle in the asset viewer changed from amber to cyan.
- Member invitations are now email-based; the legacy "lookup user by username" flow is removed from the UI.

[Unreleased]: https://github.com/filemcp/filemcp/compare/main...HEAD
