import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.db import transaction
from .models import AidProject, Organization, FinancialTransaction, Donor, Country, Sector, ImplementingOrganization, ImportLog

logger = logging.getLogger(__name__)

def check_import_permission(user):
    """Check if user has permission to perform bulk imports"""
    if not user.is_authenticated:
        return False
    
    # Super users can always import
    if user.is_superuser:
        return True
    
    # Check user profile permissions
    if hasattr(user, 'profile'):
        # Partner government users can import
        if user.profile.permission_level == 'partner_government':
            return True
        
        # Check role permissions if user has roles
        primary_role = user.user_roles.filter(is_primary=True).first()
        if primary_role and primary_role.role.can_create_projects:
            return True
    
    return False

@csrf_exempt
@login_required
@require_POST
def import_activities(request):
    """Bulk import activities from frontend"""
    
    # Check permissions
    if not check_import_permission(request.user):
        return JsonResponse(
            {'error': 'You do not have permission to perform bulk imports'},
            status=403
        )
    
    try:
        data = json.loads(request.body)
        activities_data = data.get('data', [])
        mappings = data.get('mappings', [])
        
        results = {
            'successful': 0,
            'failed': 0,
            'errors': [],
            'importedIds': []
        }
        
        # Create mapping dictionary for easier access
        field_mapping = {}
        for mapping in mappings:
            if mapping['fileColumnIndex'] is not None:
                field_mapping[mapping['systemFieldId']] = mapping['fileColumnIndex']
        
        with transaction.atomic():
            for idx, row in enumerate(activities_data):
                try:
                    # Extract data using mappings
                    activity_data = {}
                    for field_id, col_index in field_mapping.items():
                        column_name = list(row.keys())[col_index]
                        activity_data[field_id] = row[column_name]
                    
                    # Validate required fields
                    required_fields = ['title', 'donor_name', 'start_date_planned', 'end_date_planned', 
                                     'total_budget', 'recipient_country_name']
                    for field in required_fields:
                        if not activity_data.get(field):
                            raise ValueError(f"{field} is required")
                    
                    # Find or create related objects
                    donor, _ = Donor.objects.get_or_create(
                        name=activity_data['donor_name'],
                        defaults={'code': activity_data['donor_name'][:20].upper().replace(' ', '_')}
                    )
                    
                    if activity_data.get('recipient_country_name'):
                        country, _ = Country.objects.get_or_create(
                            name=activity_data['recipient_country_name'],
                            defaults={
                                'iso_code': activity_data['recipient_country_name'][:3].upper(),
                                'region': 'Unknown',
                                'income_level': 'low'
                            }
                        )
                    else:
                        country = None
                    
                    if activity_data.get('implementing_org_name'):
                        impl_org, _ = ImplementingOrganization.objects.get_or_create(
                            name=activity_data['implementing_org_name'],
                            defaults={'org_type': 'other'}
                        )
                    else:
                        impl_org = None
                    
                    if activity_data.get('sector_name'):
                        sector, _ = Sector.objects.get_or_create(
                            name=activity_data['sector_name'],
                            defaults={
                                'code': activity_data['sector_name'][:10].upper().replace(' ', '_'),
                                'category': 'Other'
                            }
                        )
                    else:
                        sector = None
                    
                    # Create activity
                    activity = AidProject.objects.create(
                        title=activity_data['title'],
                        description=activity_data.get('description', ''),
                        donor=donor,
                        implementing_org=impl_org,
                        activity_status=activity_data.get('activity_status', 'pipeline'),
                        start_date_planned=datetime.strptime(activity_data['start_date_planned'], '%Y-%m-%d').date(),
                        end_date_planned=datetime.strptime(activity_data['end_date_planned'], '%Y-%m-%d').date(),
                        recipient_country=country,
                        sector=sector,
                        total_budget=Decimal(str(activity_data['total_budget'])),
                        currency='USD',
                        created_by=request.user
                    )
                    
                    results['successful'] += 1
                    results['importedIds'].append(str(activity.id))
                    
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': idx + 2,  # +2 for header row and 0-index
                        'field': 'general',
                        'message': str(e),
                        'value': None
                    })
                    logger.error(f"Error importing activity row {idx}: {str(e)}")
        
        # Log the import
        ImportLog.objects.create(
            entity_type='activities',
            file_name=data.get('fileName', 'Unknown'),
            total_rows=len(activities_data),
            successful_rows=results['successful'],
            failed_rows=results['failed'],
            user=request.user,
            field_mappings=mappings,
            error_log=results['errors'][:100]  # Store first 100 errors
        )
        
        return JsonResponse(results)
        
    except Exception as e:
        logger.error(f"Import activities error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_POST
def import_organizations(request):
    """Bulk import organizations from frontend"""
    
    # Check permissions
    if not check_import_permission(request.user):
        return JsonResponse(
            {'error': 'You do not have permission to perform bulk imports'},
            status=403
        )
    
    try:
        data = json.loads(request.body)
        organizations_data = data.get('data', [])
        mappings = data.get('mappings', [])
        
        results = {
            'successful': 0,
            'failed': 0,
            'errors': [],
            'importedIds': []
        }
        
        # Create mapping dictionary
        field_mapping = {}
        for mapping in mappings:
            if mapping['fileColumnIndex'] is not None:
                field_mapping[mapping['systemFieldId']] = mapping['fileColumnIndex']
        
        with transaction.atomic():
            for idx, row in enumerate(organizations_data):
                try:
                    # Extract data using mappings
                    org_data = {}
                    for field_id, col_index in field_mapping.items():
                        column_name = list(row.keys())[col_index]
                        org_data[field_id] = row[column_name]
                    
                    # Validate required fields
                    if not org_data.get('name'):
                        raise ValueError("Organization name is required")
                    if not org_data.get('organization_type'):
                        raise ValueError("Organization type is required")
                    
                    # Find country if provided
                    country = None
                    if org_data.get('country_name'):
                        country, _ = Country.objects.get_or_create(
                            name=org_data['country_name'],
                            defaults={
                                'iso_code': org_data['country_name'][:3].upper(),
                                'region': 'Unknown',
                                'income_level': 'low'
                            }
                        )
                    
                    # Create organization
                    organization = Organization.objects.create(
                        name=org_data['name'],
                        short_name=org_data.get('short_name', ''),
                        iati_identifier=org_data.get('iati_identifier') if org_data.get('iati_identifier') else None,
                        organization_type=org_data['organization_type'].lower(),
                        description=org_data.get('description', ''),
                        website=org_data.get('website', ''),
                        contact_email=org_data.get('contact_email', ''),
                        country=country,
                        created_by=request.user
                    )
                    
                    results['successful'] += 1
                    results['importedIds'].append(str(organization.id))
                    
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': idx + 2,
                        'field': 'general',
                        'message': str(e),
                        'value': None
                    })
                    logger.error(f"Error importing organization row {idx}: {str(e)}")
        
        # Log the import
        ImportLog.objects.create(
            entity_type='organizations',
            file_name=data.get('fileName', 'Unknown'),
            total_rows=len(organizations_data),
            successful_rows=results['successful'],
            failed_rows=results['failed'],
            user=request.user,
            field_mappings=mappings,
            error_log=results['errors'][:100]
        )
        
        return JsonResponse(results)
        
    except Exception as e:
        logger.error(f"Import organizations error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_POST
def import_transactions(request):
    """Bulk import transactions from frontend"""
    
    # Check permissions
    if not check_import_permission(request.user):
        return JsonResponse(
            {'error': 'You do not have permission to perform bulk imports'},
            status=403
        )
    
    try:
        data = json.loads(request.body)
        transactions_data = data.get('data', [])
        mappings = data.get('mappings', [])
        
        results = {
            'successful': 0,
            'failed': 0,
            'errors': [],
            'importedIds': []
        }
        
        # Create mapping dictionary
        field_mapping = {}
        for mapping in mappings:
            if mapping['fileColumnIndex'] is not None:
                field_mapping[mapping['systemFieldId']] = mapping['fileColumnIndex']
        
        with transaction.atomic():
            for idx, row in enumerate(transactions_data):
                try:
                    # Extract data using mappings
                    trans_data = {}
                    for field_id, col_index in field_mapping.items():
                        column_name = list(row.keys())[col_index]
                        trans_data[field_id] = row[column_name]
                    
                    # Validate required fields
                    required_fields = ['project_title', 'transaction_date', 'amount', 'transaction_type']
                    for field in required_fields:
                        if not trans_data.get(field):
                            raise ValueError(f"{field} is required")
                    
                    # Find the project
                    try:
                        project = AidProject.objects.get(title=trans_data['project_title'])
                    except AidProject.DoesNotExist:
                        raise ValueError(f"Activity '{trans_data['project_title']}' not found")
                    
                    # Find provider/receiver organizations if provided
                    provider_org = None
                    if trans_data.get('provider_organization_name'):
                        provider_org, _ = Organization.objects.get_or_create(
                            name=trans_data['provider_organization_name'],
                            defaults={
                                'organization_type': 'other',
                                'created_by': request.user
                            }
                        )
                    
                    receiver_org = None
                    if trans_data.get('receiver_organization_name'):
                        receiver_org, _ = Organization.objects.get_or_create(
                            name=trans_data['receiver_organization_name'],
                            defaults={
                                'organization_type': 'other',
                                'created_by': request.user
                            }
                        )
                    
                    # Create transaction
                    transaction = FinancialTransaction.objects.create(
                        project=project,
                        transaction_type=trans_data['transaction_type'].lower(),
                        amount=Decimal(str(trans_data['amount'])),
                        currency=trans_data.get('currency', 'USD').upper(),
                        transaction_date=datetime.strptime(trans_data['transaction_date'], '%Y-%m-%d').date(),
                        provider_organization=provider_org,
                        receiver_organization=receiver_org,
                        description=trans_data.get('description', ''),
                        reference=trans_data.get('reference', ''),
                        created_by=request.user
                    )
                    
                    results['successful'] += 1
                    results['importedIds'].append(str(transaction.id))
                    
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': idx + 2,
                        'field': 'general',
                        'message': str(e),
                        'value': None
                    })
                    logger.error(f"Error importing transaction row {idx}: {str(e)}")
        
        # Log the import
        ImportLog.objects.create(
            entity_type='transactions',
            file_name=data.get('fileName', 'Unknown'),
            total_rows=len(transactions_data),
            successful_rows=results['successful'],
            failed_rows=results['failed'],
            user=request.user,
            field_mappings=mappings,
            error_log=results['errors'][:100]
        )
        
        return JsonResponse(results)
        
    except Exception as e:
        logger.error(f"Import transactions error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
@require_POST
def import_logs(request):
    """Log import activity from frontend"""
    try:
        data = json.loads(request.body)
        
        # The ImportLogger on frontend already sends the data in the right format
        # We're just creating the log here since the actual import already happened
        # This is a backup in case the import view didn't log it
        
        # Check if a log for this import already exists (within 5 seconds)
        recent_log = ImportLog.objects.filter(
            user=request.user,
            entity_type=data.get('entityType'),
            file_name=data.get('fileName'),
            import_date__gte=datetime.now() - timedelta(seconds=5)
        ).first()
        
        if not recent_log:
            ImportLog.objects.create(
                entity_type=data.get('entityType'),
                file_name=data.get('fileName'),
                total_rows=data.get('totalRows', 0),
                successful_rows=data.get('successCount', 0),
                failed_rows=data.get('failureCount', 0),
                user=request.user
            )
        
        return JsonResponse({'status': 'success'})
        
    except Exception as e:
        logger.error(f"Import log error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)