"""
Generate Secure Secrets for Production Deployment
Run this script to generate all necessary security keys
"""

import secrets
from cryptography.fernet import Fernet


def generate_jwt_secret():
    """Generate a secure JWT secret key"""
    return secrets.token_urlsafe(32)


def generate_encryption_key():
    """Generate a Fernet encryption key"""
    return Fernet.generate_key().decode()


def generate_api_key():
    """Generate a secure API key"""
    return f"sk_live_{secrets.token_urlsafe(32)}"


def main():
    print("=" * 70)
    print("SECURITY KEY GENERATOR - Vanta Compliant")
    print("=" * 70)
    print()

    print("📝 Copy these values to your .env file:")
    print()

    # JWT Secret
    jwt_secret = generate_jwt_secret()
    print("# JWT Configuration")
    print(f"SECRET_KEY={jwt_secret}")
    print()

    # Encryption Key
    encryption_key = generate_encryption_key()
    print("# Encryption at Rest")
    print(f"ENCRYPTION_KEY={encryption_key}")
    print()

    # API Keys (optional)
    api_key = generate_api_key()
    print("# API Key (optional - for API users)")
    print(f"API_KEY={api_key}")
    print()

    print("=" * 70)
    print("⚠️  IMPORTANT SECURITY REMINDERS:")
    print("=" * 70)
    print()
    print("1. ✅ NEVER commit .env file to version control")
    print("2. ✅ Store these keys in a secure password manager")
    print("3. ✅ Rotate keys every 90-180 days")
    print("4. ✅ Use different keys for dev/staging/production")
    print("5. ✅ If keys are compromised, generate new ones immediately")
    print()

    # Save to file option
    save = input("💾 Save to .env file? (y/N): ").strip().lower()

    if save == 'y':
        try:
            with open('.env', 'r') as f:
                existing = f.read()

            # Check if keys already exist
            if 'SECRET_KEY=' in existing and 'INSECURE_DEFAULT_KEY' not in existing:
                overwrite = input("⚠️  .env already has SECRET_KEY. Overwrite? (y/N): ").strip().lower()
                if overwrite != 'y':
                    print("❌ Cancelled. Keys not saved.")
                    return

            # Update .env file
            lines = existing.split('\n')
            new_lines = []
            keys_added = set()

            for line in lines:
                if line.startswith('SECRET_KEY='):
                    new_lines.append(f'SECRET_KEY={jwt_secret}')
                    keys_added.add('SECRET_KEY')
                elif line.startswith('ENCRYPTION_KEY='):
                    new_lines.append(f'ENCRYPTION_KEY={encryption_key}')
                    keys_added.add('ENCRYPTION_KEY')
                else:
                    new_lines.append(line)

            # Add missing keys
            if 'SECRET_KEY' not in keys_added:
                # Find the security section
                for i, line in enumerate(new_lines):
                    if '# SECURITY & AUTHENTICATION' in line:
                        # Find SECRET_KEY line
                        for j in range(i, len(new_lines)):
                            if 'SECRET_KEY=' in new_lines[j] or new_lines[j].strip() == '':
                                continue
                            if 'ALGORITHM=' in new_lines[j]:
                                new_lines.insert(j, f'SECRET_KEY={jwt_secret}')
                                break
                        break

            if 'ENCRYPTION_KEY' not in keys_added:
                # Find encryption section
                for i, line in enumerate(new_lines):
                    if '# ENCRYPTION & DATA PROTECTION' in line:
                        for j in range(i, len(new_lines)):
                            if 'ENCRYPTION_KEY=' in new_lines[j] or new_lines[j].strip() == '':
                                continue
                            if 'ENABLE_FIELD_ENCRYPTION=' in new_lines[j]:
                                new_lines.insert(j, f'ENCRYPTION_KEY={encryption_key}')
                                break
                        break

            # Write back
            with open('.env', 'w') as f:
                f.write('\n'.join(new_lines))

            print("✅ Keys saved to .env file")
            print()

        except FileNotFoundError:
            # Create new .env from .env.example
            try:
                with open('.env.example', 'r') as f:
                    template = f.read()

                # Replace placeholders
                template = template.replace(
                    'SECRET_KEY=CHANGE_ME_GENERATE_SECURE_KEY_HERE',
                    f'SECRET_KEY={jwt_secret}'
                )
                template = template.replace(
                    'ENCRYPTION_KEY=CHANGE_ME_GENERATE_FERNET_KEY_HERE',
                    f'ENCRYPTION_KEY={encryption_key}'
                )

                with open('.env', 'w') as f:
                    f.write(template)

                print("✅ Created new .env file with secure keys")
                print()

            except FileNotFoundError:
                print("❌ Error: .env.example not found")
                print("   Please create .env manually and copy the keys above")
                print()
    else:
        print("ℹ️  Keys not saved. Please copy manually to .env file")
        print()

    print("=" * 70)
    print("🎉 Setup complete! Next steps:")
    print("=" * 70)
    print()
    print("1. Review and update other .env settings (database, API keys, etc.)")
    print("2. Set ENVIRONMENT=production for production deployment")
    print("3. Configure SSL certificates (SSL_CERT_PATH, SSL_KEY_PATH)")
    print("4. Review SECURITY.md for complete configuration guide")
    print("5. Run security tests before deploying")
    print()
    print("📖 See SECURITY_IMPLEMENTATION_SUMMARY.md for full details")
    print()


if __name__ == "__main__":
    main()
