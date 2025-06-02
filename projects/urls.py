from django.urls import path
from . import views

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
]