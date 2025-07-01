# 🚀 Production Readiness Checklist

## 🔴 Critical Issues to Fix

### 1. Django Security Settings
- [ ] Set `DEBUG = False` in production
- [ ] Move `SECRET_KEY` to environment variable
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Set `SESSION_COOKIE_SECURE = True` (requires HTTPS)
- [ ] Set `CSRF_COOKIE_SECURE = True` (requires HTTPS)
- [ ] Enable `SECURE_SSL_REDIRECT = True`

### 2. Database Issues
- [ ] Fix "column activities_1.title does not exist" error
- [ ] Run all pending migrations
- [ ] Switch from SQLite to PostgreSQL for production
- [ ] Create database backups

### 3. Environment Configuration
- [ ] Create `.env.production` file
- [ ] Never commit sensitive credentials
- [ ] Use environment variables for all secrets

## 🟡 Important Tasks

### 4. Django Production Setup
```bash
# Install production dependencies
pip install gunicorn whitenoise python-decouple psycopg2-binary

# Generate requirements.txt
pip freeze > requirements.txt
```

### 5. Static Files Configuration
```python
# In settings.py
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

### 6. Update Django settings.py
```python
import os
from decouple import config

# Security Settings
DEBUG = config('DEBUG', default=False, cast=bool)
SECRET_KEY = config('SECRET_KEY')
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

# Database (PostgreSQL for production)
if not DEBUG:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST'),
            'PORT': config('DB_PORT', default=5432),
        }
    }

# Security headers
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
```

### 7. Frontend Production Build
```bash
cd frontend
npm run build
```

### 8. CORS Configuration
- [ ] Update CORS_ALLOWED_ORIGINS with production domain
- [ ] Remove wildcard origins

## 🟢 Pre-Deployment Steps

### 9. Testing
- [ ] Run all tests
- [ ] Test user authentication flow
- [ ] Test profile updates
- [ ] Verify all API endpoints work

### 10. Create Deployment Files

**Procfile** (for Heroku):
```
web: gunicorn aims.wsgi
release: python manage.py migrate
```

**runtime.txt**:
```
python-3.13.1
```

## 📊 Production Architecture

### Recommended Setup:
1. **Backend**: Django on Heroku/Railway/DigitalOcean
2. **Frontend**: Next.js on Vercel
3. **Database**: PostgreSQL (Heroku Postgres or Supabase)
4. **Static Files**: Whitenoise or S3
5. **Media Files**: S3 or Cloudinary

## 🔒 Security Checklist

- [ ] All passwords are strong
- [ ] Database credentials are secure
- [ ] API endpoints require authentication
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] Rate limiting is implemented
- [ ] Error logs don't expose sensitive data

## 🚦 Final Checks

- [ ] Remove all `console.log` statements
- [ ] Remove debug endpoints
- [ ] Update API URLs to production
- [ ] Configure error monitoring (Sentry)
- [ ] Set up logging
- [ ] Configure email settings
- [ ] Test password reset flow

## ⚠️ DO NOT Deploy Until:

1. All critical issues are resolved
2. Database migrations are tested
3. Security settings are configured
4. Environment variables are set
5. Production build succeeds
6. All tests pass

## 📝 Post-Deployment

- [ ] Monitor error logs
- [ ] Set up database backups
- [ ] Configure monitoring alerts
- [ ] Document deployment process
- [ ] Create rollback plan 