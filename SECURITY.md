# Security Policy

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### Private Disclosure

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues privately by:

1. **Email**: Send details to the project maintainers
2. **GitHub Security Advisories**: Use GitHub's private vulnerability reporting feature

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes or mitigations
- Your contact information for follow-up

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity and complexity

### Security Best Practices

When using COR-Matrix:

#### API Keys & Secrets

- Use strong, randomly generated API keys (32+ characters)
- Store secrets in environment variables, never in code
- Rotate API keys regularly
- Use different keys for different environments

#### Database Security

- Secure your SQLite database file with appropriate file permissions
- Consider encryption at rest for sensitive data
- Regular backups with secure storage

#### Network Security

- Use HTTPS in production environments
- Implement proper firewall rules
- Consider API rate limiting

#### Access Control

- Implement workspace-level access controls
- Regularly audit user permissions
- Use principle of least privilege

### Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in our security advisories (with permission).
