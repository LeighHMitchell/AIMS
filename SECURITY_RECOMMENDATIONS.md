# Security Recommendations

## Critical Security Fixes Applied

1. **Environment Variables**: All sensitive credentials have been moved to environment variables
2. **CORS Configuration**: Restricted to specific origins in production
3. **Authentication Middleware**: Added authentication checks to protected routes
4. **SQL Injection**: Fixed vulnerable `.extra()` queries with safe Django ORM methods
5. **Debug Mode**: Disabled in production with environment-based configuration

## Google Maps API Security

### Current Issue
The Google Maps API key needs to be accessible on the client-side, which creates a security concern.

### Recommended Solutions

1. **Domain Restriction** (Recommended)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Credentials
   - Edit your Google Maps API key
   - Under "Application restrictions", select "HTTP referrers"
   - Add your allowed domains:
     ```
     https://yourdomain.com/*
     https://www.yourdomain.com/*
     http://localhost:3000/* (for development)
     ```

2. **API Key Restrictions**
   - In the same API key settings, under "API restrictions"
   - Select "Restrict key" and choose only the APIs you need:
     - Maps JavaScript API
     - Geocoding API (if needed)

3. **Usage Quotas**
   - Set daily quotas to prevent abuse
   - Enable billing alerts

4. **Alternative: Server-Side Proxy**
   - Create backend endpoints that proxy Google Maps requests
   - Keep the API key only on the server
   - More complex but more secure

## Additional Security Measures

### 1. Rate Limiting
Install and configure rate limiting middleware:

```python
# Install django-ratelimit
pip install django-ratelimit

# In views.py
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='10/m', method='POST')
def api_add_transaction(request):
    # ... existing code
```

### 2. Content Security Policy (CSP)
Add CSP headers to prevent XSS attacks:

```python
# In settings.py
SECURE_CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' https://maps.googleapis.com; style-src 'self' 'unsafe-inline';"
```

### 3. API Authentication
Implement proper API authentication:

```python
# Install Django REST framework and JWT
pip install djangorestframework djangorestframework-simplejwt

# Configure in settings.py
INSTALLED_APPS += [
    'rest_framework',
    'rest_framework_simplejwt',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}
```

### 4. Input Validation
Add comprehensive input validation:

```python
# In forms.py
from django.core.validators import RegexValidator

class AidProjectForm(forms.ModelForm):
    title = forms.CharField(
        validators=[
            RegexValidator(
                regex='^[a-zA-Z0-9 .-]+$',
                message='Title contains invalid characters'
            )
        ]
    )
```

### 5. Database Security
- Use prepared statements (already done with Django ORM)
- Enable database encryption at rest
- Regular backups with encryption
- Use read-only database users where possible

### 6. Session Security
```python
# In settings.py
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
```

### 7. Monitoring and Logging
- Set up error tracking (e.g., Sentry)
- Monitor for suspicious activities
- Log all authentication attempts
- Regular security audits

### 8. Dependencies
- Regular dependency updates: `npm audit fix`
- Use tools like Dependabot
- Review security advisories

## Production Deployment Checklist

- [ ] All environment variables are set
- [ ] DEBUG is False
- [ ] SECRET_KEY is unique and secure
- [ ] Database uses strong passwords
- [ ] HTTPS is enforced
- [ ] Static files are served by a CDN or web server
- [ ] Error pages don't expose sensitive information
- [ ] Logging is configured properly
- [ ] Backups are automated and tested
- [ ] Monitoring is in place
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] API keys are restricted
- [ ] Security headers are set
- [ ] Regular security updates scheduled