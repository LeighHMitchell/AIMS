from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import json

class Donor(models.Model):
    """Donor organization model"""
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)
    donor_type = models.CharField(max_length=50, choices=[
        ('bilateral', 'Bilateral'),
        ('multilateral', 'Multilateral'),
        ('private', 'Private Foundation'),
        ('ngo', 'NGO'),
        ('other', 'Other')
    ])
    country = models.CharField(max_length=100)
    website = models.URLField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class Country(models.Model):
    """Country model for recipient countries"""
    name = models.CharField(max_length=100, unique=True)
    iso_code = models.CharField(max_length=3, unique=True)
    region = models.CharField(max_length=100)
    income_level = models.CharField(max_length=50, choices=[
        ('low', 'Low Income'),
        ('lower_middle', 'Lower Middle Income'),
        ('upper_middle', 'Upper Middle Income'),
        ('high', 'High Income')
    ])
    population = models.BigIntegerField(null=True, blank=True)
    gdp_per_capita = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        verbose_name_plural = "Countries"
    
    def __str__(self):
        return self.name

class Sector(models.Model):
    """Sector classification model"""
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.code} - {self.name}"

class ImplementingOrganization(models.Model):
    """Organizations that implement projects"""
    name = models.CharField(max_length=200)
    org_type = models.CharField(max_length=50, choices=[
        ('government', 'Government Agency'),
        ('ngo', 'NGO'),
        ('private', 'Private Sector'),
        ('international', 'International Organization'),
        ('academic', 'Academic Institution'),
        ('other', 'Other')
    ])
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    contact_email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    
    def __str__(self):
        return self.name

class AidProject(models.Model):
    """Enhanced Aid Project model"""
    # Basic Information
    prism_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    iati_identifier = models.CharField(max_length=100, unique=True, null=True, blank=True)
    title = models.CharField(max_length=300)
    description = models.TextField(null=True, blank=True)
    
    # Organizations
    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name='projects', null=True, blank=True)
    implementing_org = models.ForeignKey(ImplementingOrganization, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status and Dates
    activity_status = models.CharField(max_length=50, choices=[
        ('pipeline', 'Pipeline/Identification'),
        ('implementation', 'Implementation'),
        ('completion', 'Completion'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended')
    ], null=True, blank=True)
    start_date_planned = models.DateField(null=True, blank=True)
    end_date_planned = models.DateField(null=True, blank=True)
    start_date_actual = models.DateField(blank=True, null=True)
    end_date_actual = models.DateField(blank=True, null=True)
    
    # Location
    recipient_country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='projects', null=True, blank=True)
    sub_national_location = models.CharField(max_length=200, blank=True, null=True)
    
    # Classification
    sector = models.ForeignKey(Sector, on_delete=models.SET_NULL, null=True, blank=True)
    collaboration_type = models.CharField(max_length=50, choices=[
        ('bilateral', 'Bilateral'),
        ('multilateral', 'Multilateral'),
        ('triangular', 'Triangular Cooperation')
    ], blank=True, null=True)
    
    # Financial Information
    total_budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default='USD')
    funding_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Aid Type Classifications
    default_flow_type = models.CharField(max_length=50, choices=[
        ('oda', 'Official Development Assistance'),
        ('oof', 'Other Official Flows'),
        ('private', 'Private Flows'),
        ('other', 'Other')
    ], blank=True, null=True)
    
    default_finance_type = models.CharField(max_length=50, choices=[
        ('grant', 'Grant'),
        ('loan', 'Standard Loan'),
        ('concessional_loan', 'Concessional Loan'),
        ('equity', 'Equity Investment'),
        ('guarantee', 'Guarantee/Insurance'),
        ('other', 'Other')
    ], blank=True, null=True)
    
    default_aid_type = models.CharField(max_length=50, choices=[
        ('budget_support', 'Budget Support'),
        ('project_intervention', 'Project-type Intervention'),
        ('technical_assistance', 'Technical Assistance'),
        ('scholarship', 'Scholarship/Training'),
        ('debt_relief', 'Debt Relief'),
        ('other', 'Other')
    ], blank=True, null=True)
    
    default_tied_status = models.CharField(max_length=50, choices=[
        ('untied', 'Untied'),
        ('tied', 'Tied'),
        ('partially_tied', 'Partially Tied')
    ], blank=True, null=True)
    
    # Default Modality fields
    default_modality = models.IntegerField(choices=[
        (1, "Grant – Non-repayable funds, typically public sector support"),
        (2, "Loan – Repayable funds with terms and conditions"),
        (3, "Technical Assistance – Personnel, training, or capacity support"),
        (4, "Reimbursable Grant or Other – Partial repayment or hybrid arrangement"),
        (5, "Investment/Guarantee – Risk capital or financial instruments without cash transfer"),
    ], blank=True, null=True)
    default_modality_override = models.BooleanField(default=False)
    
    # Additional Information
    contact_info = models.TextField(blank=True, null=True)
    document_link = models.URLField(blank=True, null=True)
    partner_activity_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Beneficiary Information
    target_beneficiaries = models.PositiveIntegerField(null=True, blank=True)
    actual_beneficiaries = models.PositiveIntegerField(null=True, blank=True)
    
    # Results and Impact
    results_description = models.TextField(blank=True, null=True)
    impact_assessment = models.TextField(blank=True, null=True)
    
    # System Fields
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-submitted_at']
        verbose_name = "Aid Project"
        verbose_name_plural = "Aid Projects"
    
    def __str__(self):
        return self.title
    
    @property
    def progress_percentage(self):
        """Calculate project progress based on dates"""
        if not self.start_date_actual or not self.end_date_planned:
            return 0
        
        from datetime import date
        today = date.today()
        
        if today < self.start_date_actual:
            return 0
        elif today > self.end_date_planned:
            return 100
        else:
            total_days = (self.end_date_planned - self.start_date_actual).days
            elapsed_days = (today - self.start_date_actual).days
            return min(100, max(0, (elapsed_days / total_days) * 100))
    
    @property
    def is_overdue(self):
        """Check if project is overdue"""
        from datetime import date
        return (self.end_date_planned and 
                self.activity_status == 'implementation' and 
                date.today() > self.end_date_planned)

    def calculate_modality(self):
        """Calculate modality based on aid type and finance type"""
        # Skip auto calculation if override is on
        if self.default_modality_override:
            return self.default_modality

        aid_type = self.default_aid_type
        finance_type = self.default_finance_type

        if aid_type in ['1220', '1230', '1240', '1250']:
            return 3  # Technical Assistance
        elif finance_type in ['110', '111', '112', '113', '114', '115', '116', '117', '118']:
            return 1  # Grant
        elif finance_type in ['421', '422', '431', '423', '424', '425']:
            if finance_type == '422':
                return 4  # Reimbursable Grant
            return 2  # Loan
        elif finance_type in ['510', '520', '530', '1100']:
            return 5  # Investment/Guarantee

        return 4  # Fallback

    def save(self, *args, **kwargs):
        # Auto-calculate modality unless override is enabled
        if not self.default_modality_override:
            self.default_modality = self.calculate_modality()
        
        # PRISM ID is now generated in the view when the form is first loaded
        super().save(*args, **kwargs)

class ProjectBudget(models.Model):
    """Detailed budget breakdown for projects"""
    project = models.ForeignKey(AidProject, on_delete=models.CASCADE, related_name='budget_items')
    category = models.CharField(max_length=100)
    description = models.CharField(max_length=300)
    planned_amount = models.DecimalField(max_digits=12, decimal_places=2)
    actual_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='USD')
    
    def __str__(self):
        return f"{self.project.title} - {self.category}"

class FinancialTransaction(models.Model):
    """Financial transactions for projects (disbursements, expenditures, etc.)"""
    TRANSACTION_TYPE_CHOICES = [
        ('disbursement', 'Disbursement'),
        ('expenditure', 'Expenditure'),
        ('incoming_funds', 'Incoming Funds'),
        ('loan_repayment', 'Loan Repayment'),
        ('interest_payment', 'Interest Payment'),
    ]
    
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('MMK', 'Myanmar Kyat'),
        ('JPY', 'Japanese Yen'),
        ('CNY', 'Chinese Yuan'),
        ('THB', 'Thai Baht'),
    ]
    
    project = models.ForeignKey(AidProject, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    transaction_date = models.DateField()
    
    # Provider and receiver organizations
    provider_organization = models.ForeignKey(
        'Organization', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='provided_transactions',
        help_text="Organization providing the funds"
    )
    receiver_organization = models.ForeignKey(
        'Organization', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='received_transactions',
        help_text="Organization receiving the funds"
    )
    
    # Additional transaction details
    description = models.TextField(blank=True, help_text="Transaction description or notes")
    reference = models.CharField(max_length=100, blank=True, help_text="Transaction reference number")
    
    # IATI specific fields
    iati_identifier = models.CharField(max_length=200, blank=True)
    aid_type = models.CharField(max_length=50, blank=True)
    flow_type = models.CharField(max_length=50, blank=True)
    tied_status = models.CharField(max_length=50, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-transaction_date', '-created_at']
    
    def __str__(self):
        return f"{self.project.title} - {self.get_transaction_type_display()} - {self.amount} {self.currency}"

class FinancialCommitment(models.Model):
    """Financial commitments for projects"""
    COMMITMENT_TYPE_CHOICES = [
        ('total_commitment', 'Total Commitment'),
        ('annual_commitment', 'Annual Commitment'),
        ('conditional_commitment', 'Conditional Commitment'),
    ]
    
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('MMK', 'Myanmar Kyat'),
        ('JPY', 'Japanese Yen'),
        ('CNY', 'Chinese Yuan'),
        ('THB', 'Thai Baht'),
    ]
    
    project = models.ForeignKey(AidProject, on_delete=models.CASCADE, related_name='commitments')
    commitment_type = models.CharField(max_length=30, choices=COMMITMENT_TYPE_CHOICES, default='total_commitment')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    commitment_date = models.DateField()
    
    # Provider and receiver organizations
    provider_organization = models.ForeignKey(
        'Organization', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='provided_commitments',
        help_text="Organization providing the commitment"
    )
    receiver_organization = models.ForeignKey(
        'Organization', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='received_commitments',
        help_text="Organization receiving the commitment"
    )
    
    # Additional commitment details
    description = models.TextField(blank=True, help_text="Commitment description or notes")
    reference = models.CharField(max_length=100, blank=True, help_text="Commitment reference number")
    
    # IATI specific fields
    iati_identifier = models.CharField(max_length=200, blank=True)
    aid_type = models.CharField(max_length=50, blank=True)
    flow_type = models.CharField(max_length=50, blank=True)
    tied_status = models.CharField(max_length=50, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-commitment_date', '-created_at']
    
    def __str__(self):
        return f"{self.project.title} - {self.get_commitment_type_display()} - {self.amount} {self.currency}"

class ProjectMilestone(models.Model):
    """Project milestones and deliverables"""
    project = models.ForeignKey(AidProject, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=200)
    description = models.TextField()
    planned_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=[
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('delayed', 'Delayed'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    
    class Meta:
        ordering = ['planned_date']
    
    def __str__(self):
        return f"{self.project.title} - {self.title}"

class ProjectDocument(models.Model):
    """Documents related to projects"""
    project = models.ForeignKey(AidProject, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=50, choices=[
        ('proposal', 'Project Proposal'),
        ('agreement', 'Agreement'),
        ('report', 'Progress Report'),
        ('evaluation', 'Evaluation'),
        ('financial', 'Financial Report'),
        ('other', 'Other')
    ])
    file_url = models.URLField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"{self.project.title} - {self.title}"


# User Profile Management Models

class UserProfile(models.Model):
    """Extended user profile with professional information"""
    TITLE_CHOICES = [
        ('mr', 'Mr.'),
        ('ms', 'Ms.'),
        ('mrs', 'Mrs.'),
        ('dr', 'Dr.'),
        ('prof', 'Prof.'),
        ('hon', 'Hon.'),
        ('', 'No Title'),
    ]
    
    PERMISSION_LEVEL_CHOICES = [
        ('organization', 'Organization Level - Can only edit activities for my organization'),
        ('partner_government', 'Partner Government - Can edit all activities (Super User)'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    title = models.CharField(max_length=10, choices=TITLE_CHOICES, blank=True)
    first_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    position = models.CharField(max_length=200, blank=True)
    organizational_affiliation = models.ForeignKey(
        'Organization', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Primary organizational affiliation"
    )
    permission_level = models.CharField(
        max_length=20, 
        choices=PERMISSION_LEVEL_CHOICES, 
        default='organization',
        help_text="Determines editing rights within the system"
    )
    phone = models.CharField(max_length=20, blank=True)
    secondary_email = models.EmailField(blank=True, help_text="Optional secondary email address")
    bio = models.TextField(blank=True, help_text="Professional background and expertise")
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    years_experience = models.PositiveIntegerField(null=True, blank=True)
    specializations = models.TextField(blank=True, help_text="Areas of expertise")
    languages = models.TextField(blank=True, help_text="Languages spoken")
    email_notifications = models.BooleanField(default=True)
    dashboard_layout = models.CharField(max_length=20, default='default')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.get_display_name()} - {self.position}"
    
    def get_display_name(self):
        """Get the full display name"""
        name_parts = []
        if self.title:
            # Use get_title_display() to get the proper display value (e.g., 'Mr.' instead of 'mr')
            name_parts.append(self.get_title_display())
        if self.first_name:
            name_parts.append(self.first_name)
        if self.middle_name:
            name_parts.append(self.middle_name)
        if self.last_name:
            name_parts.append(self.last_name)
        
        if name_parts:
            return ' '.join(name_parts)
        return self.user.get_full_name() or self.user.username
    
    def get_full_name_without_title(self):
        """Get full name without title"""
        name_parts = []
        if self.first_name:
            name_parts.append(self.first_name)
        if self.middle_name:
            name_parts.append(self.middle_name)
        if self.last_name:
            name_parts.append(self.last_name)
        
        if name_parts:
            return ' '.join(name_parts)
        return self.user.get_full_name() or self.user.username
    
    def get_primary_organization(self):
        """Get the user's primary organization"""
        if self.organizational_affiliation:
            return self.organizational_affiliation
        # Fallback to role-based organization
        primary_role = self.user.user_roles.filter(is_primary=True).first()
        return primary_role.organization if primary_role else None
    
    def get_primary_role(self):
        """Get the user's primary role"""
        primary_role = self.user.user_roles.filter(is_primary=True).first()
        return primary_role.role if primary_role else None
    
    def has_super_user_permissions(self):
        """Check if user has partner government (super user) permissions"""
        return self.permission_level == 'partner_government'
    
    def can_edit_project(self, project):
        """Check if user can edit a specific project"""
        if self.has_super_user_permissions():
            return True
        
        # Organization level users can only edit projects from their organization
        if self.permission_level == 'organization':
            user_org = self.get_primary_organization()
            if user_org:
                # Check if project creator is from the same organization
                if hasattr(project, 'created_by') and project.created_by:
                    project_creator_org = project.created_by.profile.get_primary_organization()
                    return user_org == project_creator_org
        
        return False


class Organization(models.Model):
    """Organizations that users can be affiliated with"""
    ORG_TYPE_CHOICES = [
        ('government', 'Government Agency'),
        ('ngo', 'Non-Governmental Organization'),
        ('ingo', 'International NGO'),
        ('un', 'UN Agency'),
        ('bilateral', 'Bilateral Donor'),
        ('multilateral', 'Multilateral Organization'),
        ('private', 'Private Sector'),
        ('academic', 'Academic Institution'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=200, unique=True)
    short_name = models.CharField(max_length=50, blank=True)
    iati_identifier = models.CharField(max_length=200, blank=True, unique=True, null=True, help_text="IATI organization identifier")
    organization_type = models.CharField(max_length=20, choices=ORG_TYPE_CHOICES)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    logo_url = models.URLField(blank=True)
    
    # Contact information
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    
    # System fields
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.short_name or self.name
    
    def get_member_count(self):
        return self.user_roles.filter(is_active=True).count()


class Role(models.Model):
    """Roles that users can have within organizations"""
    ROLE_CATEGORY_CHOICES = [
        ('operational', 'Operational'),
        ('management', 'Management'),
        ('technical', 'Technical'),
        ('administrative', 'Administrative'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=ROLE_CATEGORY_CHOICES, default='operational')
    
    # Permissions
    can_create_projects = models.BooleanField(default=True)
    can_edit_own_projects = models.BooleanField(default=True)
    can_edit_org_projects = models.BooleanField(default=False)
    can_approve_projects = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=True)
    can_export_data = models.BooleanField(default=True)
    can_manage_users = models.BooleanField(default=False)
    can_manage_organization = models.BooleanField(default=False)
    
    # System fields
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return self.name


class UserRole(models.Model):
    """Junction table for users, organizations, and roles"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_roles')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')
    
    # Role details
    is_primary = models.BooleanField(default=False, help_text="Primary role/organization for this user")
    is_active = models.BooleanField(default=True)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    
    # Additional context
    notes = models.TextField(blank=True, help_text="Additional notes about this role assignment")
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_roles')
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'organization', 'role']
        ordering = ['-is_primary', '-start_date']
    
    def __str__(self):
        return f"{self.user.username} - {self.role.name} at {self.organization.name}"
    
    def is_current(self):
        """Check if this role assignment is currently active"""
        if not self.is_active:
            return False
        if self.end_date and self.end_date < timezone.now().date():
            return False
        return True


# Signal to create user profile automatically
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class AdminUnit(models.Model):
    """Administrative units (districts, states, provinces, etc.)"""
    ADMIN_LEVEL_CHOICES = [
        ('country', 'Country'),
        ('region', 'Region/State/Province'),
        ('district', 'District/County'),
        ('municipality', 'Municipality/City'),
        ('village', 'Village/Ward'),
    ]
    
    name = models.CharField(max_length=200)
    admin_level = models.CharField(max_length=20, choices=ADMIN_LEVEL_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='admin_units')
    code = models.CharField(max_length=50, blank=True, help_text="Official administrative code")
    
    # Geographic data
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    boundary_geojson = models.JSONField(null=True, blank=True, help_text="GeoJSON boundary data")
    
    # Metadata
    population = models.PositiveIntegerField(null=True, blank=True)
    area_km2 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        unique_together = ['name', 'admin_level', 'country']
        ordering = ['country', 'admin_level', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_admin_level_display()}, {self.country.name})"
    
    def get_full_path(self):
        """Get full administrative path (e.g., 'Myanmar > Shan State > Lashio District')"""
        path = [self.name]
        parent = self.parent
        while parent:
            path.insert(0, parent.name)
            parent = parent.parent
        path.insert(0, self.country.name)
        return ' > '.join(path)

class ProjectLocation(models.Model):
    """Base model for project locations"""
    LOCATION_TYPE_CHOICES = [
        ('management', 'Management Location'),
        ('implementation', 'Implementation Site'),
        ('impact', 'Impact Area'),
    ]
    
    MANAGEMENT_TYPE_CHOICES = [
        ('donor_hq', 'Donor HQ'),
        ('un_regional', 'UN Regional Office'),
        ('govt_ministry', 'Government Ministry'),
        ('implementing_partner', 'Implementing Partner'),
        ('other', 'Other'),
    ]
    
    SITE_TYPE_CHOICES = [
        ('office', 'Office'),
        ('field_site', 'Field Site'),
        ('health_centre', 'Health Centre'),
        ('school', 'School'),
        ('community_center', 'Community Center'),
        ('virtual', 'Virtual'),
        ('other', 'Other'),
    ]
    
    IMPACT_SCOPE_CHOICES = [
        ('nationwide', 'Nationwide'),
        ('multi_region', 'Multi-region'),
        ('state_province', 'State/Province'),
        ('district', 'District'),
        ('municipality', 'Municipality'),
        ('village', 'Village'),
        ('other', 'Other'),
    ]
    
    project = models.ForeignKey(AidProject, on_delete=models.CASCADE, related_name='locations')
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES)
    
    # Common fields
    name = models.CharField(max_length=200, blank=True, help_text="Location name or description")
    notes = models.TextField(blank=True, help_text="Additional notes about this location")
    
    # Geographic coordinates
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Administrative units (many-to-many for multi-location projects)
    admin_units = models.ManyToManyField(AdminUnit, blank=True, related_name='project_locations')
    
    # GeoJSON data for complex boundaries
    boundary_geojson = models.JSONField(null=True, blank=True, help_text="GeoJSON boundary data for impact areas")
    
    # Management location specific fields
    managed_by = models.CharField(max_length=20, choices=MANAGEMENT_TYPE_CHOICES, blank=True)
    organization_name = models.CharField(max_length=200, blank=True)
    organization_address = models.TextField(blank=True)
    
    # Implementation site specific fields
    has_physical_site = models.BooleanField(default=True)
    site_type = models.CharField(max_length=20, choices=SITE_TYPE_CHOICES, blank=True)
    
    # Impact area specific fields
    impact_scope = models.CharField(max_length=20, choices=IMPACT_SCOPE_CHOICES, blank=True)
    estimated_population = models.PositiveIntegerField(null=True, blank=True, help_text="Estimated population affected")
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['location_type', 'name']
    
    def __str__(self):
        return f"{self.get_location_type_display()}: {self.name or 'Unnamed'} ({self.project.title})"
    
    @property
    def coordinates(self):
        """Return coordinates as a tuple if both lat/lng are set"""
        if self.latitude and self.longitude:
            return (float(self.latitude), float(self.longitude))
        return None
    
    def get_admin_units_display(self):
        """Get a comma-separated list of administrative units"""
        return ', '.join([unit.get_full_path() for unit in self.admin_units.all()])
    
    def get_geojson_feature(self):
        """Return location as a GeoJSON feature"""
        feature = {
            "type": "Feature",
            "properties": {
                "id": self.id,
                "name": self.name,
                "location_type": self.location_type,
                "location_type_display": self.get_location_type_display(),
                "notes": self.notes,
            }
        }
        
        if self.boundary_geojson:
            feature["geometry"] = self.boundary_geojson
        elif self.coordinates:
            feature["geometry"] = {
                "type": "Point",
                "coordinates": [float(self.longitude), float(self.latitude)]
            }
        else:
            feature["geometry"] = None
            
        return feature

class ImportLog(models.Model):
    """Log of all bulk import activities"""
    entity_type = models.CharField(max_length=50, choices=[
        ('activities', 'Activities'),
        ('organizations', 'Organizations'),
        ('transactions', 'Transactions'),
    ])
    file_name = models.CharField(max_length=255)
    total_rows = models.PositiveIntegerField()
    successful_rows = models.PositiveIntegerField()
    failed_rows = models.PositiveIntegerField()
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    import_date = models.DateTimeField(auto_now_add=True)
    
    # Store mapping configuration for rollback
    field_mappings = models.JSONField(null=True, blank=True)
    
    # Store error details
    error_log = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-import_date']
    
    def __str__(self):
        return f"{self.entity_type} import by {self.user} on {self.import_date}"