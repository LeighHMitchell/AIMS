from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from projects.models import Organization, Role, UserRole, Country

class Command(BaseCommand):
    help = 'Create sample organizations and roles for user profile management'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample organizations and roles...')
        
        # Get or create some countries
        myanmar, _ = Country.objects.get_or_create(
            name='Myanmar',
            defaults={
                'iso_code': 'MMR',
                'region': 'Southeast Asia',
                'income_level': 'lower_middle'
            }
        )
        
        usa, _ = Country.objects.get_or_create(
            name='United States',
            defaults={
                'iso_code': 'USA',
                'region': 'North America',
                'income_level': 'high'
            }
        )
        
        uk, _ = Country.objects.get_or_create(
            name='United Kingdom',
            defaults={
                'iso_code': 'GBR',
                'region': 'Europe',
                'income_level': 'high'
            }
        )
        
        # Create sample organizations
        organizations_data = [
            {
                'name': 'Ministry of Planning and Finance',
                'short_name': 'MOPF',
                'organization_type': 'government',
                'description': 'Government ministry responsible for national planning and financial management',
                'country': myanmar,
                'contact_email': 'info@mopf.gov.mm',
                'website': 'https://mopf.gov.mm'
            },
            {
                'name': 'United Nations Development Programme',
                'short_name': 'UNDP',
                'organization_type': 'un',
                'description': 'UN agency focused on sustainable development and poverty reduction',
                'country': myanmar,
                'contact_email': 'registry.mm@undp.org',
                'website': 'https://undp.org'
            },
            {
                'name': 'World Bank Group',
                'short_name': 'World Bank',
                'organization_type': 'multilateral',
                'description': 'International financial institution providing loans and grants',
                'country': usa,
                'contact_email': 'info@worldbank.org',
                'website': 'https://worldbank.org'
            },
            {
                'name': 'UK Foreign, Commonwealth & Development Office',
                'short_name': 'FCDO',
                'organization_type': 'bilateral',
                'description': 'UK government department responsible for foreign affairs and development',
                'country': uk,
                'contact_email': 'enquiries@fcdo.gov.uk',
                'website': 'https://gov.uk/fcdo'
            },
            {
                'name': 'Save the Children International',
                'short_name': 'Save the Children',
                'organization_type': 'ingo',
                'description': 'International NGO focused on children\'s rights and welfare',
                'country': uk,
                'contact_email': 'info@savethechildren.org',
                'website': 'https://savethechildren.org'
            },
            {
                'name': 'Myanmar Development Resource Institute',
                'short_name': 'MDRI',
                'organization_type': 'ngo',
                'description': 'Local think tank focused on development research and policy',
                'country': myanmar,
                'contact_email': 'info@mdri.org.mm',
                'website': 'https://mdri.org.mm'
            }
        ]
        
        created_orgs = []
        for org_data in organizations_data:
            org, created = Organization.objects.get_or_create(
                name=org_data['name'],
                defaults=org_data
            )
            if created:
                self.stdout.write(f'Created organization: {org.name}')
            created_orgs.append(org)
        
        # Create sample roles
        roles_data = [
            {
                'name': 'Development Partner Focal Point',
                'description': 'Responsible for entering and updating aid activity data for the organization',
                'category': 'operational',
                'can_create_projects': True,
                'can_edit_own_projects': True,
                'can_edit_org_projects': False,
                'can_approve_projects': False,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': False,
                'can_manage_organization': False,
            },
            {
                'name': 'Government Official Focal Point',
                'description': 'Tasked with reviewing, validating, and coordinating aid data at national level',
                'category': 'management',
                'can_create_projects': True,
                'can_edit_own_projects': True,
                'can_edit_org_projects': True,
                'can_approve_projects': True,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': False,
                'can_manage_organization': False,
            },
            {
                'name': 'Programme Officer',
                'description': 'Manages specific development programmes and projects',
                'category': 'operational',
                'can_create_projects': True,
                'can_edit_own_projects': True,
                'can_edit_org_projects': False,
                'can_approve_projects': False,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': False,
                'can_manage_organization': False,
            },
            {
                'name': 'Technical Advisor',
                'description': 'Provides technical expertise and guidance on development projects',
                'category': 'technical',
                'can_create_projects': True,
                'can_edit_own_projects': True,
                'can_edit_org_projects': True,
                'can_approve_projects': False,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': False,
                'can_manage_organization': False,
            },
            {
                'name': 'Monitoring & Evaluation Officer',
                'description': 'Responsible for monitoring project progress and conducting evaluations',
                'category': 'technical',
                'can_create_projects': False,
                'can_edit_own_projects': True,
                'can_edit_org_projects': True,
                'can_approve_projects': False,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': False,
                'can_manage_organization': False,
            },
            {
                'name': 'Country Director',
                'description': 'Senior management role overseeing all country operations',
                'category': 'management',
                'can_create_projects': True,
                'can_edit_own_projects': True,
                'can_edit_org_projects': True,
                'can_approve_projects': True,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': True,
                'can_manage_organization': True,
            },
            {
                'name': 'IT Administrator',
                'description': 'Manages technical systems and user access',
                'category': 'administrative',
                'can_create_projects': False,
                'can_edit_own_projects': False,
                'can_edit_org_projects': False,
                'can_approve_projects': False,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': True,
                'can_manage_organization': False,
            },
            {
                'name': 'Data Quality Reviewer',
                'description': 'Reviews and validates data quality and completeness',
                'category': 'technical',
                'can_create_projects': False,
                'can_edit_own_projects': True,
                'can_edit_org_projects': True,
                'can_approve_projects': True,
                'can_view_analytics': True,
                'can_export_data': True,
                'can_manage_users': False,
                'can_manage_organization': False,
            }
        ]
        
        created_roles = []
        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                name=role_data['name'],
                defaults=role_data
            )
            if created:
                self.stdout.write(f'Created role: {role.name}')
            created_roles.append(role)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {len(created_orgs)} organizations and {len(created_roles)} roles'
            )
        ) 