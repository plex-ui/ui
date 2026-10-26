# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Plex UI, please **do not** open a public GitHub issue. Instead, report it privately so we can fix it before it's disclosed.

### Preferred channel

Email **plexuikit@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce or proof-of-concept
- Affected version(s) of `@plexui/ui` (or commit SHA for the docs/skills)
- Your name / handle for credit (optional)

We aim to acknowledge reports within **2 business days** and issue a fix within **14 days** for high-severity issues.

### Scope

Relevant to report:

- XSS / injection in the React components, documentation site, or skill content
- Dependency vulnerabilities that directly affect shipped code
- Exposure of private data through the MCP server or Claude Code plugin

Out of scope:

- Issues in third-party dependencies without a concrete exploit path through Plex UI
- Self-XSS that requires the user to paste attacker-controlled HTML into their own app

## Supported Versions

We currently provide security fixes for the latest minor version of `@plexui/ui`. Older versions may not be patched — upgrading is recommended.

## Credit

We maintain a short list of security researchers who've helped harden Plex UI at the bottom of the [changelog](https://plexui.com/docs/changelog). If you'd rather stay anonymous, let us know in your report.
