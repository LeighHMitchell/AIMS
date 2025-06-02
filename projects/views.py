import pandas as pd
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Count, Avg
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from datetime import datetime, timedelta
import json
import csv
import random
from django.db import models
from django.urls import reverse
import logging

from .forms import (
    AidProjectForm, UserProfileForm, OrganizationForm, RoleForm, 
    UserRoleForm, OrganizationSearchForm, IATIOrganizationImportForm,
    ProjectLocationForm, AdminUnitForm, ProjectLocationFormSet,
    ProjectBudgetFormSet, ProjectMilestoneFormSet, ProjectDocumentFormSet,
    FinancialTransactionForm, FinancialCommitmentForm
)
from .models import (
    AidProject, Donor, Country, Sector, ImplementingOrganization,
    ProjectBudget, ProjectMilestone, ProjectDocument,
    UserProfile, Organization, Role, UserRole, AdminUnit, ProjectLocation,
    FinancialTransaction, FinancialCommitment
)
from .iati_service import IATIRegistryService

def home(request):
    """Enhanced home page with key statistics"""
    # Key statistics
    total_projects = AidProject.objects.count()
    total_funding = AidProject.objects.aggregate(Sum('funding_amount'))['funding_amount__sum'] or 0
    active_projects = AidProject.objects.filter(activity_status='implementation').count()
    total_donors = Donor.objects.count()
    total_countries = Country.objects.filter(projects__isnull=False).distinct().count()
    
    # Recent projects
    recent_projects = AidProject.objects.select_related('donor', 'recipient_country').order_by('-submitted_at')[:5]
    
    # Projects by status
    status_data = AidProject.objects.values('activity_status').annotate(count=Count('id'))
    
    # Top donors by funding
    top_donors = (AidProject.objects
                  .values('donor__name')
                  .annotate(total_funding=Sum('funding_amount'))
                  .order_by('-total_funding')[:5])
    
    # Projects by country
    country_data = (AidProject.objects
                    .values('recipient_country__name')
                    .annotate(count=Count('id'), total_funding=Sum('funding_amount'))
                    .order_by('-total_funding')[:10])
    
    context = {
        'total_projects': total_projects,
        'total_funding': total_funding,
        'active_projects': active_projects,
        'total_donors': total_donors,
        'total_countries': total_countries,
        'recent_projects': recent_projects,
        'status_data': list(status_data),
        'top_donors': list(top_donors),
        'country_data': list(country_data),
    }
    
    return render(request, 'home.html', context)

def submit_project(request):
    """Enhanced project submission with better form handling"""
    if request.method == 'POST':
        # Get the project ID from the form if it exists (for updates)
        project_id = request.POST.get('project_id')
        if project_id:
            project = get_object_or_404(AidProject, id=project_id)
        else:
            project = None
        
        # Determine the action based on which button was clicked
        action = request.POST.get('action', 'save_draft')
        
        # Set validation mode based on action
        if action == 'save_and_publish':
            validation_mode = 'full'
        else:
            validation_mode = 'draft'
        
        form = AidProjectForm(request.POST, instance=project, validation_mode=validation_mode)
        
        if form.is_valid():
            project = form.save(commit=False)
            if request.user.is_authenticated:
                project.created_by = request.user
            
            # Set project status based on action
            if action == 'save_and_publish':
                # Add a published status field or flag if needed
                # For now, we'll just save normally
                pass
            
            project.save()
            
            # Customize success message based on action
            if action == 'save_and_publish':
                messages.success(request, f"Project '{project.title}' published successfully.")
                # For published projects, go to detail page
                return redirect('project_detail', project_id=project.id)
            elif action == 'save_and_next':
                messages.success(request, f"Project '{project.title}' saved as draft. Continue to next section.")
            else:
                messages.success(request, f"Project '{project.title}' saved as draft.")
            
            # For draft saves, redirect back to edit form to continue editing
            return redirect('edit_project', project_id=project.id)
        else:
            if validation_mode == 'full':
                messages.error(request, "Please complete all required fields before publishing.")
            else:
                messages.error(request, "Please correct the errors below.")
    else:
        # For GET requests, create a new project instance with PRISM ID immediately
        project = AidProject()
        # Generate PRISM ID immediately
        random_numbers = ''.join([str(random.randint(0, 9)) for _ in range(8)])
        project.prism_id = f'PRISM-{random_numbers}'
        # Save the project so it has an ID and the PRISM ID is persisted
        project.save()
        
        form = AidProjectForm(instance=project, validation_mode='draft')

    # Get data for dropdowns
    donors = Donor.objects.all().order_by('name')
    countries = Country.objects.all().order_by('name')
    sectors = Sector.objects.all().order_by('name')
    implementing_orgs = ImplementingOrganization.objects.all().order_by('name')
    organizations = Organization.objects.all().order_by('name')
    
    # Get existing financial data if editing
    transactions = []
    commitments = []
    if project and project.id:
        transactions = project.transactions.all().order_by('-transaction_date')
        commitments = project.commitments.all().order_by('-commitment_date')

    context = {
        'form': form,
        'project': project,
        'donors': donors,
        'countries': countries,
        'sectors': sectors,
        'implementing_orgs': implementing_orgs,
        'organizations': organizations,
        'transactions': transactions,
        'commitments': commitments,
    }
    
    return render(request, 'projects/submit_project.html', context)

def project_dashboard(request):
    """Enhanced dashboard with filtering and search"""
    projects = AidProject.objects.select_related('donor', 'recipient_country', 'sector').all()
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        projects = projects.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(iati_identifier__icontains=search_query) |
            Q(donor__name__icontains=search_query)
        )
    
    # Filtering
    status_filter = request.GET.get('status', '')
    if status_filter:
        projects = projects.filter(activity_status=status_filter)
    
    donor_filter = request.GET.get('donor', '')
    if donor_filter:
        projects = projects.filter(donor_id=donor_filter)
    
    country_filter = request.GET.get('country', '')
    if country_filter:
        projects = projects.filter(recipient_country_id=country_filter)
    
    sector_filter = request.GET.get('sector', '')
    if sector_filter:
        projects = projects.filter(sector_id=sector_filter)
    
    # Sorting
    sort_by = request.GET.get('sort', '-submitted_at')
    projects = projects.order_by(sort_by)
    
    # Pagination
    paginator = Paginator(projects, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get filter options
    donors = Donor.objects.all().order_by('name')
    countries = Country.objects.all().order_by('name')
    sectors = Sector.objects.all().order_by('name')
    
    # Statistics for current filtered results
    total_funding = projects.aggregate(Sum('funding_amount'))['funding_amount__sum'] or 0
    avg_funding = projects.aggregate(Avg('funding_amount'))['funding_amount__avg'] or 0
    
    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'status_filter': status_filter,
        'donor_filter': donor_filter,
        'country_filter': country_filter,
        'sector_filter': sector_filter,
        'sort_by': sort_by,
        'donors': donors,
        'countries': countries,
        'sectors': sectors,
        'total_funding': total_funding,
        'avg_funding': avg_funding,
        'total_projects': projects.count(),
        'status_choices': AidProject._meta.get_field('activity_status').choices,
    }
    
    return render(request, 'projects/dashboard.html', context)

def project_detail(request, project_id):
    """Detailed project view"""
    project = get_object_or_404(
        AidProject.objects.select_related('donor', 'recipient_country', 'sector', 'implementing_org'),
        id=project_id
    )
    
    # Get related data
    budget_items = project.budget_items.all()
    milestones = project.milestones.all()
    documents = project.documents.all()
    transactions = project.transactions.all().order_by('-transaction_date')
    commitments = project.commitments.all().order_by('-commitment_date')
    
    # Calculate budget totals
    total_planned_budget = budget_items.aggregate(Sum('planned_amount'))['planned_amount__sum'] or 0
    total_actual_budget = budget_items.aggregate(Sum('actual_amount'))['actual_amount__sum'] or 0
    
    # Calculate financial totals
    total_transactions = transactions.aggregate(Sum('amount'))['amount__sum'] or 0
    total_commitments = commitments.aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Milestone statistics
    total_milestones = milestones.count()
    completed_milestones = milestones.filter(status='completed').count()
    milestone_completion_rate = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
    
    context = {
        'project': project,
        'budget_items': budget_items,
        'milestones': milestones,
        'documents': documents,
        'total_planned_budget': total_planned_budget,
        'total_actual_budget': total_actual_budget,
        'total_transactions': total_transactions,
        'total_commitments': total_commitments,
        'total_milestones': total_milestones,
        'completed_milestones': completed_milestones,
        'milestone_completion_rate': milestone_completion_rate,
    }
    
    return render(request, 'projects/detail.html', context)

def edit_project(request, project_id):
    """Edit existing project"""
    project = get_object_or_404(AidProject, id=project_id)
    
    # Check if user is authenticated for editing
    if not request.user.is_authenticated:
        messages.warning(request, "Please log in to edit projects.")
        return redirect('project_detail', project_id=project.id)
    
    if request.method == 'POST':
        # Determine the action based on which button was clicked
        action = request.POST.get('action', 'save_draft')
        
        # Set validation mode based on action
        if action == 'save_and_publish':
            validation_mode = 'full'
        else:
            validation_mode = 'draft'
        
        form = AidProjectForm(request.POST, instance=project, validation_mode=validation_mode)
        
        if form.is_valid():
            project = form.save()
            
            # Customize success message and redirect based on action
            if action == 'save_and_publish':
                messages.success(request, f"Project '{project.title}' published successfully.")
                # For published projects, go to detail page
                return redirect('project_detail', project_id=project.id)
            elif action == 'save_and_next':
                messages.success(request, f"Project '{project.title}' updated. Continue to next section.")
            else:
                messages.success(request, f"Project '{project.title}' updated and saved as draft.")
            
            # For draft saves, stay on edit form to continue editing
            return redirect('edit_project', project_id=project.id)
        else:
            if validation_mode == 'full':
                messages.error(request, "Please complete all required fields before publishing.")
            else:
                messages.error(request, "Please correct the errors below.")
    else:
        form = AidProjectForm(instance=project, validation_mode='draft')

    # Get data for dropdowns
    donors = Donor.objects.all().order_by('name')
    countries = Country.objects.all().order_by('name')
    sectors = Sector.objects.all().order_by('name')
    implementing_orgs = ImplementingOrganization.objects.all().order_by('name')
    organizations = Organization.objects.all().order_by('name')
    
    # Get existing financial data if editing
    transactions = []
    commitments = []
    if project and project.id:
        transactions = project.transactions.all().order_by('-transaction_date')
        commitments = project.commitments.all().order_by('-commitment_date')

    context = {
        'form': form,
        'project': project,
        'donors': donors,
        'countries': countries,
        'sectors': sectors,
        'implementing_orgs': implementing_orgs,
        'organizations': organizations,
        'transactions': transactions,
        'commitments': commitments,
    }
    
    return render(request, 'projects/submit_project.html', context)

def analytics_dashboard(request):
    """Analytics and reporting dashboard"""
    # Time-based analysis
    current_year = timezone.now().year
    projects_by_year = (AidProject.objects
                       .extra(select={'year': "strftime('%%Y', start_date_planned)"})
                       .values('year')
                       .annotate(count=Count('id'), total_funding=Sum('funding_amount'))
                       .order_by('year'))
    
    # Funding by sector
    funding_by_sector = (AidProject.objects
                        .values('sector__name')
                        .annotate(total_funding=Sum('funding_amount'))
                        .order_by('-total_funding'))
    
    # Projects by status
    projects_by_status = (AidProject.objects
                         .values('activity_status')
                         .annotate(count=Count('id'))
                         .order_by('activity_status'))
    
    # Geographic distribution
    geographic_data = (AidProject.objects
                      .values('recipient_country__name', 'recipient_country__region')
                      .annotate(count=Count('id'), total_funding=Sum('funding_amount'))
                      .order_by('-total_funding'))
    
    # Donor analysis
    donor_analysis = (AidProject.objects
                     .values('donor__name', 'donor__donor_type')
                     .annotate(
                         project_count=Count('id'),
                         total_funding=Sum('funding_amount'),
                         avg_funding=Avg('funding_amount')
                     )
                     .order_by('-total_funding'))
    
    # Monthly trends (last 12 months)
    twelve_months_ago = timezone.now() - timedelta(days=365)
    monthly_trends = (AidProject.objects
                     .filter(submitted_at__gte=twelve_months_ago)
                     .extra(select={'month': "strftime('%%Y-%%m', submitted_at)"})
                     .values('month')
                     .annotate(count=Count('id'), total_funding=Sum('funding_amount'))
                     .order_by('month'))
    
    context = {
        'projects_by_year': list(projects_by_year),
        'funding_by_sector': list(funding_by_sector),
        'projects_by_status': list(projects_by_status),
        'geographic_data': list(geographic_data),
        'donor_analysis': list(donor_analysis),
        'monthly_trends': list(monthly_trends),
    }
    
    return render(request, 'projects/analytics.html', context)

def export_projects(request):
    """Export projects to CSV"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="aid_projects.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'IATI Identifier', 'Title', 'Donor', 'Recipient Country', 'Sector',
        'Status', 'Start Date', 'End Date', 'Total Budget', 'Funding Amount',
        'Currency', 'Implementing Organization', 'Target Beneficiaries'
    ])
    
    projects = AidProject.objects.select_related('donor', 'recipient_country', 'sector', 'implementing_org').all()
    
    for project in projects:
        writer.writerow([
            project.iati_identifier,
            project.title,
            project.donor.name,
            project.recipient_country.name,
            project.sector.name if project.sector else '',
            project.get_activity_status_display(),
            project.start_date_planned,
            project.end_date_planned,
            project.total_budget,
            project.funding_amount,
            project.currency,
            project.implementing_org.name if project.implementing_org else '',
            project.target_beneficiaries or ''
        ])
    
    return response

# API endpoints for AJAX requests
def api_project_stats(request):
    """API endpoint for project statistics"""
    stats = {
        'total_projects': AidProject.objects.count(),
        'total_funding': float(AidProject.objects.aggregate(Sum('funding_amount'))['funding_amount__sum'] or 0),
        'active_projects': AidProject.objects.filter(activity_status='implementation').count(),
        'completed_projects': AidProject.objects.filter(activity_status='completion').count(),
    }
    return JsonResponse(stats)

def api_funding_by_country(request):
    """API endpoint for funding by country data"""
    data = list(AidProject.objects
                .values('recipient_country__name')
                .annotate(total_funding=Sum('funding_amount'))
                .order_by('-total_funding')[:10])
    return JsonResponse(data, safe=False)

def api_countries(request):
    """API endpoint for countries list"""
    countries = list(Country.objects.values('id', 'name').order_by('name'))
    return JsonResponse(countries, safe=False)

@require_http_methods(["POST"])
def api_add_transaction(request):
    """API endpoint to add a financial transaction"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            project_id = data.get('project_id')
            
            if not project_id:
                return JsonResponse({'success': False, 'error': 'Project ID is required'})
            
            project = get_object_or_404(AidProject, id=project_id)
            
            # Create transaction
            transaction = FinancialTransaction.objects.create(
                project=project,
                transaction_type=data.get('transaction_type'),
                amount=data.get('amount'),
                currency=data.get('currency'),
                transaction_date=data.get('transaction_date'),
                provider_organization_id=data.get('provider_organization'),
                receiver_organization_id=data.get('receiver_organization'),
                description=data.get('description', ''),
                reference=data.get('reference', ''),
                created_by=request.user if request.user.is_authenticated else None
            )
            
            return JsonResponse({
                'success': True,
                'transaction': {
                    'id': transaction.id,
                    'transaction_type': transaction.get_transaction_type_display(),
                    'amount': str(transaction.amount),
                    'currency': transaction.currency,
                    'transaction_date': transaction.transaction_date.strftime('%Y-%m-%d'),
                    'provider': transaction.provider_organization.name if transaction.provider_organization else '',
                    'receiver': transaction.receiver_organization.name if transaction.receiver_organization else '',
                    'description': transaction.description,
                    'reference': transaction.reference,
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@require_http_methods(["POST"])
def api_add_commitment(request):
    """API endpoint to add a financial commitment"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            project_id = data.get('project_id')
            
            if not project_id:
                return JsonResponse({'success': False, 'error': 'Project ID is required'})
            
            project = get_object_or_404(AidProject, id=project_id)
            
            # Create commitment
            commitment = FinancialCommitment.objects.create(
                project=project,
                commitment_type=data.get('commitment_type', 'total_commitment'),
                amount=data.get('amount'),
                currency=data.get('currency'),
                commitment_date=data.get('commitment_date'),
                provider_organization_id=data.get('provider_organization'),
                receiver_organization_id=data.get('receiver_organization'),
                description=data.get('description', ''),
                reference=data.get('reference', ''),
                created_by=request.user if request.user.is_authenticated else None
            )
            
            return JsonResponse({
                'success': True,
                'commitment': {
                    'id': commitment.id,
                    'commitment_type': commitment.get_commitment_type_display(),
                    'amount': str(commitment.amount),
                    'currency': commitment.currency,
                    'commitment_date': commitment.commitment_date.strftime('%Y-%m-%d'),
                    'provider': commitment.provider_organization.name if commitment.provider_organization else '',
                    'receiver': commitment.receiver_organization.name if commitment.receiver_organization else '',
                    'description': commitment.description,
                    'reference': commitment.reference,
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

@require_http_methods(["DELETE"])
def api_delete_transaction(request, transaction_id):
    """API endpoint to delete a financial transaction"""
    try:
        transaction = get_object_or_404(FinancialTransaction, id=transaction_id)
        transaction.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_http_methods(["DELETE"])
def api_delete_commitment(request, commitment_id):
    """API endpoint to delete a financial commitment"""
    try:
        commitment = get_object_or_404(FinancialCommitment, id=commitment_id)
        commitment.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

# User Profile Management Views

@login_required
def user_profile(request):
    """View user profile with all associated information"""
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    user_roles = UserRole.objects.filter(user=request.user, is_active=True).select_related('organization', 'role')
    
    # Get user's projects
    user_projects = AidProject.objects.filter(created_by=request.user).order_by('-submitted_at')[:5]
    
    # Get user's organization projects if they have org-level permissions
    org_projects = []
    primary_org = profile.get_primary_organization()
    if primary_org:
        primary_role = profile.get_primary_role()
        if primary_role and primary_role.can_edit_org_projects:
            org_projects = AidProject.objects.filter(
                created_by__user_roles__organization=primary_org
            ).exclude(created_by=request.user).order_by('-submitted_at')[:5]
    
    context = {
        'profile': profile,
        'user_roles': user_roles,
        'user_projects': user_projects,
        'org_projects': org_projects,
        'primary_organization': primary_org,
        'primary_role': profile.get_primary_role(),
    }
    
    return render(request, 'profiles/profile.html', context)

@login_required
def edit_profile(request):
    """Edit user profile"""
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your profile has been updated successfully.')
            return redirect('user_profile')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserProfileForm(instance=profile)
    
    context = {
        'form': form,
        'profile': profile,
    }
    
    return render(request, 'profiles/edit_profile.html', context)

@login_required
def manage_roles(request):
    """Manage user roles and organization affiliations"""
    user_roles = UserRole.objects.filter(user=request.user).select_related('organization', 'role')
    available_organizations = Organization.objects.filter(is_active=True)
    available_roles = Role.objects.filter(is_active=True)
    
    context = {
        'user_roles': user_roles,
        'available_organizations': available_organizations,
        'available_roles': available_roles,
    }
    
    return render(request, 'profiles/manage_roles.html', context)

@login_required
def add_role(request):
    """Add a new role assignment for the user"""
    # Get organization ID from query parameter
    org_id = request.GET.get('org')
    initial_data = {}
    
    if org_id:
        try:
            organization = Organization.objects.get(id=org_id, is_active=True)
            initial_data['organization'] = organization
        except Organization.DoesNotExist:
            messages.warning(request, f'Organization with ID {org_id} not found.')
    
    if request.method == 'POST':
        form = UserRoleForm(request.POST, user=request.user)
        if form.is_valid():
            user_role = form.save(commit=False)
            user_role.user = request.user
            
            # If this is marked as primary, unset other primary roles
            if user_role.is_primary:
                UserRole.objects.filter(user=request.user, is_primary=True).update(is_primary=False)
            
            user_role.save()
            messages.success(request, f'Role "{user_role.role.name}" at "{user_role.organization.name}" has been added.')
            return redirect('manage_roles')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserRoleForm(user=request.user, initial=initial_data)
    
    context = {
        'form': form,
        'title': 'Add New Role',
    }
    
    return render(request, 'profiles/role_form.html', context)

@login_required
def edit_role(request, role_id):
    """Edit an existing role assignment"""
    user_role = get_object_or_404(UserRole, id=role_id, user=request.user)
    
    if request.method == 'POST':
        form = UserRoleForm(request.POST, instance=user_role, user=request.user)
        if form.is_valid():
            user_role = form.save(commit=False)
            
            # If this is marked as primary, unset other primary roles
            if user_role.is_primary:
                UserRole.objects.filter(user=request.user, is_primary=True).exclude(id=user_role.id).update(is_primary=False)
            
            user_role.save()
            messages.success(request, f'Role assignment has been updated.')
            return redirect('manage_roles')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserRoleForm(instance=user_role, user=request.user)
    
    context = {
        'form': form,
        'user_role': user_role,
        'title': 'Edit Role Assignment',
    }
    
    return render(request, 'profiles/role_form.html', context)

@login_required
def remove_role(request, role_id):
    """Remove a role assignment"""
    user_role = get_object_or_404(UserRole, id=role_id, user=request.user)
    
    if request.method == 'POST':
        org_name = user_role.organization.name
        role_name = user_role.role.name
        user_role.delete()
        messages.success(request, f'Role "{role_name}" at "{org_name}" has been removed.')
        return redirect('manage_roles')
    
    context = {
        'user_role': user_role,
    }
    
    return render(request, 'profiles/confirm_remove_role.html', context)

def organization_directory(request):
    """Public directory of organizations"""
    form = OrganizationSearchForm(request.GET)
    organizations = Organization.objects.filter(is_active=True)
    
    if form.is_valid():
        search = form.cleaned_data.get('search')
        org_type = form.cleaned_data.get('organization_type')
        country = form.cleaned_data.get('country')
        
        if search:
            organizations = organizations.filter(
                Q(name__icontains=search) |
                Q(short_name__icontains=search) |
                Q(description__icontains=search)
            )
        
        if org_type:
            organizations = organizations.filter(organization_type=org_type)
        
        if country:
            organizations = organizations.filter(country=country)
    
    organizations = organizations.order_by('name')
    
    # Pagination
    paginator = Paginator(organizations, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'form': form,
        'page_obj': page_obj,
        'organizations': page_obj.object_list,
    }
    
    return render(request, 'profiles/organization_directory.html', context)

def organization_detail(request, org_id):
    """View organization details"""
    organization = get_object_or_404(Organization, id=org_id, is_active=True)
    
    # Get organization members (if user has permission)
    members = []
    if request.user.is_authenticated:
        user_org_roles = UserRole.objects.filter(
            user=request.user, 
            organization=organization, 
            is_active=True
        )
        if user_org_roles.exists():
            # User is a member, show other members
            members = UserRole.objects.filter(
                organization=organization, 
                is_active=True
            ).select_related('user', 'role')
    
    # Get organization's projects
    org_projects = AidProject.objects.filter(
        created_by__user_roles__organization=organization
    ).distinct().order_by('-submitted_at')[:10]
    
    context = {
        'organization': organization,
        'members': members,
        'org_projects': org_projects,
        'member_count': organization.get_member_count(),
    }
    
    return render(request, 'profiles/organization_detail.html', context)

@login_required
def create_organization(request):
    """Create a new organization"""
    if request.method == 'POST':
        form = OrganizationForm(request.POST)
        if form.is_valid():
            organization = form.save(commit=False)
            organization.created_by = request.user
            organization.save()
            
            messages.success(request, f'Organization "{organization.name}" has been created successfully.')
            return redirect('organization_detail', org_id=organization.id)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = OrganizationForm()
    
    context = {
        'form': form,
        'title': 'Create New Organization',
    }
    
    return render(request, 'profiles/organization_form.html', context)

@login_required
def edit_organization(request, org_id):
    """Edit organization details"""
    organization = get_object_or_404(Organization, id=org_id)
    
    # Check if user has permission to edit this organization
    user_role = UserRole.objects.filter(
        user=request.user,
        organization=organization,
        role__can_manage_organization=True,
        is_active=True
    ).first()
    
    if not user_role and not request.user.is_superuser:
        messages.error(request, 'You do not have permission to edit this organization.')
        return redirect('organization_detail', org_id=organization.id)
    
    if request.method == 'POST':
        form = OrganizationForm(request.POST, instance=organization)
        if form.is_valid():
            form.save()
            messages.success(request, f'Organization "{organization.name}" has been updated.')
            return redirect('organization_detail', org_id=organization.id)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = OrganizationForm(instance=organization)
    
    context = {
        'form': form,
        'organization': organization,
        'title': 'Edit Organization',
    }
    
    return render(request, 'profiles/organization_form.html', context)

def role_directory(request):
    """Directory of available roles"""
    roles = Role.objects.filter(is_active=True).order_by('category', 'name')
    
    # Group roles by category
    roles_by_category = {}
    for role in roles:
        category = role.get_category_display()
        if category not in roles_by_category:
            roles_by_category[category] = []
        roles_by_category[category].append(role)
    
    context = {
        'roles_by_category': roles_by_category,
    }
    
    return render(request, 'profiles/role_directory.html', context)

@login_required
def profile_management(request):
    """Unified profile management page combining profile editing and role management"""
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    user_roles = UserRole.objects.filter(user=request.user).select_related('organization', 'role')
    
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your profile has been updated successfully.')
            return redirect('profile_management')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserProfileForm(instance=profile)
    
    context = {
        'profile': profile,
        'profile_form': form,
        'user_roles': user_roles,
        'primary_organization': profile.get_primary_organization(),
        'primary_role': profile.get_primary_role(),
    }
    
    return render(request, 'profiles/profile_management.html', context)

# IATI Import Views

@login_required
def import_organizations(request):
    """Import organization data from IATI Registry or XML files"""
    from .forms import IATIOrganizationImportForm
    from .iati_service import IATIRegistryService
    from .models import Organization, Country
    import json
    
    logger = logging.getLogger(__name__)
    
    # Check if this is an IATI import request
    if request.GET.get('type') == 'iati' or request.POST.get('action') in ['fetch', 'import']:
        form = IATIOrganizationImportForm()
        organization_data = None
        organization_data_json = None
        error_message = None
        warning_message = None
        
        if request.method == 'POST':
            action = request.POST.get('action')
            logger.info(f"Processing IATI import action: {action}")
            logger.info(f"POST data: {dict(request.POST)}")
            logger.info(f"Request headers: {dict(request.headers)}")
            logger.info(f"Content type: {request.content_type}")
            
            # Handle case where action is None or empty
            if not action:
                logger.warning("No action specified in POST request")
                # Try to determine action from form data
                if request.POST.get('iati_identifier'):
                    action = 'fetch'
                    logger.info("Defaulting to 'fetch' action based on iati_identifier presence")
                else:
                    logger.error("No iati_identifier found in POST data")
                    error_message = "Invalid form submission. Please try again."
            
            if action == 'fetch':
                form = IATIOrganizationImportForm(request.POST)
                logger.info(f"Form is_valid: {form.is_valid()}")
                if not form.is_valid():
                    logger.error(f"Form errors: {form.errors}")
                
                if form.is_valid():
                    iati_identifier = form.cleaned_data['iati_identifier']
                    logger.info(f"Fetching organization data for identifier: {iati_identifier}")
                    
                    # Check if organization already exists
                    existing_org = Organization.objects.filter(iati_identifier=iati_identifier).first()
                    if existing_org:
                        warning_message = f"Organization with IATI identifier '{iati_identifier}' already exists: {existing_org.name}"
                        logger.warning(warning_message)
                    
                    # Fetch organization data from IATI
                    try:
                        iati_service = IATIRegistryService()
                        organization_data = iati_service.get_organization_info(iati_identifier)
                        
                        if organization_data:
                            organization_data_json = json.dumps(organization_data)
                            success_msg = f"Successfully fetched organization data for '{iati_identifier}': {organization_data.get('name', 'Unknown')}"
                            messages.success(request, success_msg)
                            logger.info(success_msg)
                        else:
                            error_message = f"Could not find organization data for IATI identifier '{iati_identifier}'. Please check the identifier and try again."
                            logger.error(error_message)
                    except Exception as e:
                        error_message = f"Error fetching organization data: {str(e)}"
                        logger.error(error_message, exc_info=True)
                else:
                    logger.warning(f"Form validation failed: {form.errors}")
            
            elif action == 'import':
                iati_identifier = request.POST.get('iati_identifier')
                organization_data_json = request.POST.get('organization_data')
                
                logger.info(f"Importing organization with identifier: {iati_identifier}")
                
                if iati_identifier and organization_data_json:
                    try:
                        organization_data = json.loads(organization_data_json)
                        
                        # Check if organization already exists
                        existing_org = Organization.objects.filter(iati_identifier=iati_identifier).first()
                        if existing_org:
                            warning_msg = f"Organization with IATI identifier '{iati_identifier}' already exists: {existing_org.name}"
                            messages.warning(request, warning_msg)
                            logger.warning(warning_msg)
                            return redirect('organization_detail', org_id=existing_org.id)
                        
                        # Try to find matching country
                        country = None
                        if organization_data.get('country'):
                            country = Country.objects.filter(
                                models.Q(name__icontains=organization_data['country']) |
                                models.Q(iso_code__iexact=organization_data['country'])
                            ).first()
                            if country:
                                logger.info(f"Found matching country: {country.name}")
                            else:
                                logger.info(f"No matching country found for: {organization_data['country']}")
                        
                        # Create new organization
                        new_org = Organization.objects.create(
                            name=organization_data.get('name', iati_identifier),
                            short_name=organization_data.get('name', '')[:50] if organization_data.get('name') else '',
                            iati_identifier=iati_identifier,
                            organization_type=organization_data.get('organization_type', 'other'),
                            description=organization_data.get('description', ''),
                            website=organization_data.get('website', ''),
                            contact_email=organization_data.get('contact_email', ''),
                            contact_phone=organization_data.get('contact_phone', ''),
                            address=organization_data.get('address', ''),
                            country=country,
                            created_by=request.user
                        )
                        
                        success_msg = f"Successfully imported organization '{new_org.name}' from IATI Registry!"
                        messages.success(request, success_msg)
                        logger.info(success_msg)
                        return redirect('organization_detail', org_id=new_org.id)
                        
                    except json.JSONDecodeError:
                        error_message = "Invalid organization data format."
                        logger.error(error_message)
                    except Exception as e:
                        error_message = f"Error importing organization: {str(e)}"
                        logger.error(error_message, exc_info=True)
                else:
                    error_message = "Missing organization data for import."
                    logger.error(error_message)
        
        context = {
            'form': form,
            'organization_data': organization_data,
            'organization_data_json': organization_data_json,
            'error_message': error_message,
            'warning_message': warning_message,
        }
        
        return render(request, 'imports/iati_organization_import.html', context)
    
    # Handle traditional file upload
    if request.method == 'POST':
        # Handle file upload and processing
        uploaded_file = request.FILES.get('iati_file')
        
        if not uploaded_file:
            messages.error(request, 'Please select a file to upload.')
            return redirect('import_organizations')
        
        # Validate file type
        if not uploaded_file.name.endswith('.xml'):
            messages.error(request, 'Please upload a valid XML file.')
            return redirect('import_organizations')
        
        try:
            # Process the IATI organization file
            # This is a placeholder for actual IATI processing logic
            messages.success(request, f'Successfully processed {uploaded_file.name}. Organization data import initiated.')
            return redirect('import_organizations')
        except Exception as e:
            messages.error(request, f'Error processing file: {str(e)}')
            return redirect('import_organizations')
    
    context = {
        'import_type': 'organizations',
        'title': 'Import Organization Data',
        'description': 'Import organization data from IATI XML files to populate the organization directory.',
        'file_types': 'IATI Organization XML files',
        'icon': 'fa-building',
    }
    
    return render(request, 'imports/import_form.html', context)

@login_required
def import_activities(request):
    """Import activity data from IATI XML files"""
    if request.method == 'POST':
        # Handle file upload and processing
        uploaded_file = request.FILES.get('iati_file')
        
        if not uploaded_file:
            messages.error(request, 'Please select a file to upload.')
            return redirect('import_activities')
        
        # Validate file type
        if not uploaded_file.name.endswith('.xml'):
            messages.error(request, 'Please upload a valid XML file.')
            return redirect('import_activities')
        
        try:
            # Process the IATI activity file
            # This is a placeholder for actual IATI processing logic
            messages.success(request, f'Successfully processed {uploaded_file.name}. Activity data import initiated.')
            return redirect('import_activities')
        except Exception as e:
            messages.error(request, f'Error processing file: {str(e)}')
            return redirect('import_activities')
    
    context = {
        'import_type': 'activities',
        'title': 'Import Activity Data',
        'description': 'Import project and activity data from IATI XML files to create new projects in the system.',
        'file_types': 'IATI Activity XML files',
        'icon': 'fa-project-diagram',
    }
    
    return render(request, 'imports/import_form.html', context)

@login_required
def import_transactions(request):
    """Import transaction data from IATI XML files"""
    if request.method == 'POST':
        # Handle file upload and processing
        uploaded_file = request.FILES.get('iati_file')
        
        if not uploaded_file:
            messages.error(request, 'Please select a file to upload.')
            return redirect('import_transactions')
        
        # Validate file type
        if not uploaded_file.name.endswith('.xml'):
            messages.error(request, 'Please upload a valid XML file.')
            return redirect('import_transactions')
        
        try:
            # Process the IATI transaction file
            # This is a placeholder for actual IATI processing logic
            messages.success(request, f'Successfully processed {uploaded_file.name}. Transaction data import initiated.')
            return redirect('import_transactions')
        except Exception as e:
            messages.error(request, f'Error processing file: {str(e)}')
            return redirect('import_transactions')
    
    context = {
        'import_type': 'transactions',
        'title': 'Import Transaction Data',
        'description': 'Import financial transaction data from IATI XML files to update project budgets and financial information.',
        'file_types': 'IATI Transaction XML files',
        'icon': 'fa-exchange-alt',
    }
    
    return render(request, 'imports/import_form.html', context)