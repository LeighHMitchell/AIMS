#!/usr/bin/env python
"""
Quick fixes for production readiness
"""
import os
import sys
import random
import string

def generate_secret_key():
    """Generate a new secret key"""
    chars = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(chars) for _ in range(50))

def create_env_file():
    """Create a .env file with production settings"""
    env_content = f"""# Django Settings
DEBUG=False
SECRET_KEY={generate_secret_key()}
ALLOWED_HOSTS=localhost,127.0.0.1,.vercel.app,.herokuapp.com

# Database (Update with your production database)
DATABASE_URL=sqlite:///db.sqlite3

# CORS (Update with your frontend URL)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3008,https://your-app.vercel.app

# Django Settings for Production
SECURE_SSL_REDIRECT=False  # Set to True when you have HTTPS
SESSION_COOKIE_SECURE=False  # Set to True when you have HTTPS
CSRF_COOKIE_SECURE=False  # Set to True when you have HTTPS
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("✅ Created .env file with production settings")
    print("⚠️  IMPORTANT: Update the database URL and CORS origins before deploying!")

def create_requirements():
    """Generate requirements.txt"""
    os.system("pip freeze > requirements.txt")
    print("✅ Generated requirements.txt")

def create_deployment_files():
    """Create necessary deployment files"""
    
    # Procfile for Heroku
    with open('Procfile', 'w') as f:
        f.write("web: gunicorn aims.wsgi --log-file -\n")
        f.write("release: python manage.py migrate\n")
    
    # runtime.txt
    with open('runtime.txt', 'w') as f:
        f.write("python-3.13.1\n")
    
    print("✅ Created Procfile and runtime.txt")

def install_production_deps():
    """Install production dependencies"""
    deps = [
        "gunicorn",
        "whitenoise",
        "python-decouple",
        "dj-database-url",
        "psycopg2-binary"
    ]
    
    print("Installing production dependencies...")
    os.system(f"pip install {' '.join(deps)}")
    print("✅ Installed production dependencies")

def main():
    print("🚀 Preparing for Production Deployment\n")
    
    # Create environment file
    create_env_file()
    
    # Install dependencies
    install_production_deps()
    
    # Create deployment files
    create_deployment_files()
    
    # Generate requirements
    create_requirements()
    
    print("\n✅ Basic production setup complete!")
    print("\n📋 Next steps:")
    print("1. Update .env with your production database URL")
    print("2. Update CORS_ALLOWED_ORIGINS with your frontend URL")
    print("3. Test locally with DEBUG=False")
    print("4. Deploy to your chosen platform (Heroku, Railway, etc.)")
    
    print("\n⚠️  WARNING: Do not deploy until you've:")
    print("- Fixed all database issues")
    print("- Configured a production database (PostgreSQL)")
    print("- Set up proper environment variables")
    print("- Tested the application thoroughly")

if __name__ == "__main__":
    main() 