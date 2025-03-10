# Security Policy

## Reporting a Vulnerability

The Pulse for Proxmox VE team takes security issues seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

To report a security vulnerability, please follow these steps:

1. **DO NOT** disclose the vulnerability publicly (e.g., in GitHub issues)
2. Create a private security advisory in the GitHub repository by going to Security → Advisories → New advisory
3. Allow time for the issue to be addressed before disclosing it publicly

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2.0 | :x:                |

## Security Updates

Security updates will be released as part of our regular release cycle or as emergency patches depending on severity.

## Best Practices for Secure Usage

1. **API Tokens**: Always use the principle of least privilege when creating Proxmox API tokens for Pulse
2. **Network Security**: Consider running Pulse behind a reverse proxy with HTTPS if exposing it to the internet
3. **Regular Updates**: Keep Pulse updated to the latest version to benefit from security patches

Thank you for helping keep Pulse and its users safe! 