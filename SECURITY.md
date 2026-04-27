# Security Policy

We take security seriously. If you believe you've found a vulnerability in FileMCP, please follow the responsible-disclosure process below — **do not** open a public GitHub issue, post in Discord, or share details on social media before we've had a chance to investigate and ship a fix.

## Reporting a vulnerability

Email **security@nforce.ai** (fallback: **contact@nforce.ai**) with:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce, including a minimal proof-of-concept where possible
- The affected component (`apps/api`, `apps/web`, `apps/worker`, the MCP server, the hosted service at filemcp.com, or a self-hosted instance)
- Your environment (versions, OS, hosted vs self-hosted)
- Whether you'd like to be credited in the disclosure (and how)

You'll get an acknowledgement within **3 business days**. We aim to provide an initial assessment within **7 days** and to ship a fix or mitigation within **30 days** for high-severity issues. We'll keep you in the loop through the process.

## Scope

In scope:

- The hosted service at **filemcp.com**
- The code in this repository (API, web app, worker, MCP server, email service)
- Official Docker images and deployment scripts in this repository

Out of scope:

- Third-party self-hosted deployments we don't operate
- Issues that require a compromised host or stolen credentials to reproduce
- Social engineering of FileMCP staff or contractors
- Denial-of-service attacks
- Reports about software dependencies that are already publicly disclosed and tracked
- Missing best-practice headers or configuration without a demonstrable exploit
- Findings from automated scanners without proof of impact

## Supported versions

We provide security fixes for the **`main` branch** and the latest tagged release. Older releases are not actively maintained — please upgrade.

| Version | Supported |
| ------- | --------- |
| `main`  | ✅        |
| latest tagged release | ✅ |
| anything older | ❌ (please upgrade) |

## Recognition

We're a small team and don't currently run a paid bug bounty, but we're happy to credit researchers in the release notes and on a future security-acknowledgements page if you'd like recognition.

Thank you for helping keep FileMCP and its users safe.
