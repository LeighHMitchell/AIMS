from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import logout
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static
from projects.views import home

def custom_logout_view(request):
    logout(request)
    return redirect('/')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home, name='home'),
    path('auth/', include('social_django.urls', namespace='social')),
    path('logout/', custom_logout_view, name='logout'),
    path('projects/', include('projects.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)