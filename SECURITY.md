# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.1.x   | Yes       |
| < 1.1   | No        |

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub issue with exploit details.

1. Open a private report via [GitHub Security Advisories](https://github.com/tomaxtoLuca/lmstudio-mcp-local/security/advisories/new) if available, or
2. Open a minimal [issue](https://github.com/tomaxtoLuca/lmstudio-mcp-local/issues) asking for a private contact channel.

We aim to acknowledge reports within 7 days.

## Scope

This MCP server reads **local files** within a user-configured path allowlist. Out of scope for this project:

- Vulnerabilities in [LM Studio](https://lmstudio.ai/) itself
- Misconfiguration by users (overly broad `allowedPaths`, binding to `0.0.0.0`, etc.)

## Safe usage

- Keep the default bind address **`127.0.0.1`**
- Restrict **`allowedPaths`** to directories you own and may expose to local AI tools
- Do not expose the `/mcp` endpoint to untrusted networks without additional authentication
