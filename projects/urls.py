from django.urls import path
from . import views
from . import import_views
from . import api_views

urlpatterns = [
    # Main project views
    path('', views.project_dashboard, name='project_dashboard'),
    path('submit/', views.submit_project, name='submit_project'),
    path('<int:project_id>/', views.project_detail, name='project_detail'),
    path('<int:project_id>/edit/', views.edit_project, name='edit_project'),
    
    # Analytics and reporting
    path('analytics/', views.analytics_dashboard, name='analytics_dashboard'),
    path('export/', views.export_projects, name='export_projects'),
    
    # Import functionality
    path('import/organizations/', views.import_organizations, name='import_organizations'),
    path('import/activities/', views.import_activities, name='import_activities'),
    path('import/transactions/', views.import_transactions, name='import_transactions'),
    
    # API endpoints
    path('api/stats/', views.api_project_stats, name='api_project_stats'),
    path('api/funding-by-country/', views.api_funding_by_country, name='api_funding_by_country'),
    path('api/countries/', views.api_countries, name='api_countries'),
    path('api/transactions/add/', views.api_add_transaction, name='api_add_transaction'),
    path('api/commitments/add/', views.api_add_commitment, name='api_add_commitment'),
    path('api/transactions/<int:transaction_id>/delete/', views.api_delete_transaction, name='api_delete_transaction'),
    path('api/commitments/<int:commitment_id>/delete/', views.api_delete_commitment, name='api_delete_commitment'),
    
    # Django User API endpoints (replacing Supabase)
    path('api/users/', api_views.api_users, name='api_users'),
    path('api/auth/login/', api_views.api_login, name='api_login'),
    path('api/auth/logout/', api_views.api_logout, name='api_logout'),
    path('api/auth/current/', api_views.api_current_user, name='api_current_user'),
    path('api/auth/change-password/', api_views.api_change_password, name='api_change_password'),
    
    # User Profile Management
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('profile/manage/', views.profile_management, name='profile_management'),
    path('profile/roles/', views.manage_roles, name='manage_roles'),
    path('profile/roles/add/', views.add_role, name='add_role'),
    path('profile/roles/<int:role_id>/edit/', views.edit_role, name='edit_role'),
    path('profile/roles/<int:role_id>/remove/', views.remove_role, name='remove_role'),
    
    # Organization Management
    path('organizations/', views.organization_directory, name='organization_directory'),
    path('organizations/<int:org_id>/', views.organization_detail, name='organization_detail'),
    path('organizations/create/', views.create_organization, name='create_organization'),
    path('organizations/<int:org_id>/edit/', views.edit_organization, name='edit_organization'),
    
    # Role Directory
    path('roles/', views.role_directory, name='role_directory'),
    
    # Import endpoints
    path('api/import/activities/', import_views.import_activities, name='import_activities'),
    path('api/import/organizations/', import_views.import_organizations, name='import_organizations'),
    path('api/import/transactions/', import_views.import_transactions, name='import_transactions'),
    path('api/import-logs/', import_views.import_logs, name='import_logs'),
]