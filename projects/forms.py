from django import forms
from django.core.exceptions import ValidationError
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Row, Column, Submit, HTML
from crispy_forms.bootstrap import TabHolder, Tab
from .models import (
    AidProject, Donor, Country, Sector, ImplementingOrganization,
    ProjectBudget, ProjectMilestone, ProjectDocument,
    UserProfile, Organization, Role, UserRole, AdminUnit, ProjectLocation,
    FinancialTransaction, FinancialCommitment
)

class AidProjectForm(forms.ModelForm):
    class Meta:
        model = AidProject
        fields = [
            'prism_id', 'iati_identifier', 'title', 'description', 'donor', 'implementing_org',
            'activity_status', 'start_date_planned', 'end_date_planned', 
            'start_date_actual', 'end_date_actual', 'recipient_country', 
            'sub_national_location', 'sector', 'collaboration_type',
            'total_budget', 'funding_amount', 'currency', 'default_flow_type',
            'default_finance_type', 'default_aid_type', 'default_tied_status',
            'target_beneficiaries', 'actual_beneficiaries', 'results_description',
            'impact_assessment', 'contact_info', 'document_link', 'partner_activity_id'
        ]
        
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
            'results_description': forms.Textarea(attrs={'rows': 3}),
            'impact_assessment': forms.Textarea(attrs={'rows': 3}),
            'contact_info': forms.Textarea(attrs={'rows': 3}),
            'start_date_planned': forms.DateInput(attrs={'type': 'date'}),
            'end_date_planned': forms.DateInput(attrs={'type': 'date'}),
            'start_date_actual': forms.DateInput(attrs={'type': 'date'}),
            'end_date_actual': forms.DateInput(attrs={'type': 'date'}),
            'total_budget': forms.NumberInput(attrs={'step': '0.01', 'min': '0'}),
            'funding_amount': forms.NumberInput(attrs={'step': '0.01', 'min': '0'}),
            'target_beneficiaries': forms.NumberInput(attrs={'min': '0'}),
            'actual_beneficiaries': forms.NumberInput(attrs={'min': '0'}),
        }
        
        labels = {
            'iati_identifier': 'IATI Identifier',
            'start_date_planned': 'Planned Start Date',
            'end_date_planned': 'Planned End Date',
            'start_date_actual': 'Actual Start Date',
            'end_date_actual': 'Actual End Date',
            'sub_national_location': 'Sub-national Location',
            'default_flow_type': 'Flow Type',
            'default_finance_type': 'Finance Type',
            'default_aid_type': 'Aid Type',
            'default_tied_status': 'Tied Status',
        }

    def __init__(self, *args, **kwargs):
        # Extract validation mode from kwargs
        self.validation_mode = kwargs.pop('validation_mode', 'full')
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'form-horizontal'
        self.helper.label_class = 'col-lg-3'
        self.helper.field_class = 'col-lg-9'
        
        # Set required fields based on validation mode
        if self.validation_mode == 'draft':
            # For draft saves, only title is required
            self.fields['title'].required = True
            # Make all other fields optional
            for field_name in self.fields:
                if field_name != 'title':
                    self.fields[field_name].required = False
        else:
            # For full validation (publish), set all required fields
            self.fields['title'].required = True
            self.fields['description'].required = True
            self.fields['donor'].required = True
            self.fields['activity_status'].required = True
            self.fields['recipient_country'].required = True
            self.fields['start_date_planned'].required = True
            self.fields['end_date_planned'].required = True
            self.fields['total_budget'].required = True
            self.fields['funding_amount'].required = True
        
        # Add help text
        self.fields['iati_identifier'].help_text = 'Unique identifier following IATI standards'
        self.fields['total_budget'].help_text = 'Total project budget in the specified currency'
        self.fields['funding_amount'].help_text = 'Amount of funding provided by the donor'
        
        self.helper.layout = Layout(
            TabHolder(
                Tab('Basic Information',
                    Fieldset(
                        'Project Details',
                        Row(
                            Column('iati_identifier', css_class='form-group col-md-6 mb-0'),
                            Column('title', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                        'description',
                        Row(
                            Column('donor', css_class='form-group col-md-6 mb-0'),
                            Column('implementing_org', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                    )
                ),
                Tab('Timeline & Status',
                    Fieldset(
                        'Project Timeline',
                        Row(
                            Column('activity_status', css_class='form-group col-md-6 mb-0'),
                            Column('collaboration_type', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                        Row(
                            Column('start_date_planned', css_class='form-group col-md-6 mb-0'),
                            Column('end_date_planned', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                        Row(
                            Column('start_date_actual', css_class='form-group col-md-6 mb-0'),
                            Column('end_date_actual', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                    )
                ),
                Tab('Location & Sector',
                    Fieldset(
                        'Geographic and Sectoral Information',
                        Row(
                            Column('recipient_country', css_class='form-group col-md-6 mb-0'),
                            Column('sector', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                        'sub_national_location',
                    )
                ),
                Tab('Financial Information',
                    Fieldset(
                        'Budget and Funding',
                        Row(
                            Column('total_budget', css_class='form-group col-md-4 mb-0'),
                            Column('funding_amount', css_class='form-group col-md-4 mb-0'),
                            Column('currency', css_class='form-group col-md-4 mb-0'),
                            css_class='form-row'
                        ),
                        Row(
                            Column('default_flow_type', css_class='form-group col-md-6 mb-0'),
                            Column('default_finance_type', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                        Row(
                            Column('default_aid_type', css_class='form-group col-md-6 mb-0'),
                            Column('default_tied_status', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                    )
                ),
                Tab('Beneficiaries & Impact',
                    Fieldset(
                        'Target Population and Results',
                        Row(
                            Column('target_beneficiaries', css_class='form-group col-md-6 mb-0'),
                            Column('actual_beneficiaries', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                        'results_description',
                        'impact_assessment',
                    )
                ),
                Tab('Additional Information',
                    Fieldset(
                        'Contact and Documentation',
                        'contact_info',
                        Row(
                            Column('document_link', css_class='form-group col-md-6 mb-0'),
                            Column('partner_activity_id', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                    )
                ),
            ),
            HTML('<hr>'),
            Submit('submit', 'Save Project', css_class='btn btn-primary btn-lg')
        )

    def clean(self):
        cleaned_data = super().clean()
        
        # Only perform additional validation for full validation mode
        if self.validation_mode == 'full':
            start_date_planned = cleaned_data.get('start_date_planned')
            end_date_planned = cleaned_data.get('end_date_planned')
            start_date_actual = cleaned_data.get('start_date_actual')
            end_date_actual = cleaned_data.get('end_date_actual')
            total_budget = cleaned_data.get('total_budget')
            funding_amount = cleaned_data.get('funding_amount')

            # Validate date ranges
            if start_date_planned and end_date_planned:
                if start_date_planned >= end_date_planned:
                    raise ValidationError('End date must be after start date.')

            if start_date_actual and end_date_actual:
                if start_date_actual >= end_date_actual:
                    raise ValidationError('Actual end date must be after actual start date.')

            # Validate funding amount
            if total_budget and funding_amount:
                if funding_amount > total_budget:
                    raise ValidationError('Funding amount cannot exceed total budget.')

        return cleaned_data

class ProjectBudgetForm(forms.ModelForm):
    class Meta:
        model = ProjectBudget
        fields = ['category', 'description', 'planned_amount', 'actual_amount', 'currency']
        widgets = {
            'planned_amount': forms.NumberInput(attrs={'step': '0.01', 'min': '0'}),
            'actual_amount': forms.NumberInput(attrs={'step': '0.01', 'min': '0'}),
        }

class FinancialTransactionForm(forms.ModelForm):
    """Form for creating and editing financial transactions"""
    
    class Meta:
        model = FinancialTransaction
        fields = [
            'transaction_type', 'amount', 'currency', 'transaction_date',
            'provider_organization', 'receiver_organization', 'description', 'reference'
        ]
        widgets = {
            'transaction_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'amount': forms.NumberInput(attrs={'step': '0.01', 'min': '0', 'class': 'form-control'}),
            'transaction_type': forms.Select(attrs={'class': 'form-control'}),
            'currency': forms.Select(attrs={'class': 'form-control'}),
            'provider_organization': forms.Select(attrs={'class': 'form-control'}),
            'receiver_organization': forms.Select(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'form-control'}),
            'reference': forms.TextInput(attrs={'class': 'form-control'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set up organization choices
        self.fields['provider_organization'].queryset = Organization.objects.all().order_by('name')
        self.fields['receiver_organization'].queryset = Organization.objects.all().order_by('name')
        
        # Make fields required
        self.fields['transaction_type'].required = True
        self.fields['amount'].required = True
        self.fields['currency'].required = True
        self.fields['transaction_date'].required = True
        
        # Set placeholders
        self.fields['amount'].widget.attrs['placeholder'] = 'Enter amount'
        self.fields['description'].widget.attrs['placeholder'] = 'Optional transaction description'
        self.fields['reference'].widget.attrs['placeholder'] = 'Optional reference number'

class FinancialCommitmentForm(forms.ModelForm):
    """Form for creating and editing financial commitments"""
    
    class Meta:
        model = FinancialCommitment
        fields = [
            'commitment_type', 'amount', 'currency', 'commitment_date',
            'provider_organization', 'receiver_organization', 'description', 'reference'
        ]
        widgets = {
            'commitment_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'amount': forms.NumberInput(attrs={'step': '0.01', 'min': '0', 'class': 'form-control'}),
            'commitment_type': forms.Select(attrs={'class': 'form-control'}),
            'currency': forms.Select(attrs={'class': 'form-control'}),
            'provider_organization': forms.Select(attrs={'class': 'form-control'}),
            'receiver_organization': forms.Select(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'form-control'}),
            'reference': forms.TextInput(attrs={'class': 'form-control'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set up organization choices
        self.fields['provider_organization'].queryset = Organization.objects.all().order_by('name')
        self.fields['receiver_organization'].queryset = Organization.objects.all().order_by('name')
        
        # Make fields required
        self.fields['commitment_type'].required = True
        self.fields['amount'].required = True
        self.fields['currency'].required = True
        self.fields['commitment_date'].required = True
        
        # Set placeholders
        self.fields['amount'].widget.attrs['placeholder'] = 'Enter amount'
        self.fields['description'].widget.attrs['placeholder'] = 'Optional commitment description'
        self.fields['reference'].widget.attrs['placeholder'] = 'Optional reference number'

class ProjectMilestoneForm(forms.ModelForm):
    class Meta:
        model = ProjectMilestone
        fields = ['title', 'description', 'planned_date', 'actual_date', 'status']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
            'planned_date': forms.DateInput(attrs={'type': 'date'}),
            'actual_date': forms.DateInput(attrs={'type': 'date'}),
        }

class ProjectDocumentForm(forms.ModelForm):
    class Meta:
        model = ProjectDocument
        fields = ['title', 'document_type', 'file_url']

class ProjectSearchForm(forms.Form):
    search = forms.CharField(
        max_length=200, 
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Search projects...',
            'class': 'form-control'
        })
    )
    status = forms.ChoiceField(
        choices=[('', 'All Statuses')] + AidProject._meta.get_field('activity_status').choices,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    donor = forms.ModelChoiceField(
        queryset=Donor.objects.all(),
        required=False,
        empty_label="All Donors",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    country = forms.ModelChoiceField(
        queryset=Country.objects.all(),
        required=False,
        empty_label="All Countries",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    sector = forms.ModelChoiceField(
        queryset=Sector.objects.all(),
        required=False,
        empty_label="All Sectors",
        widget=forms.Select(attrs={'class': 'form-control'})
    )

# Quick forms for adding reference data
class DonorForm(forms.ModelForm):
    class Meta:
        model = Donor
        fields = ['name', 'code', 'donor_type', 'country', 'website', 'contact_email', 'description']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

class CountryForm(forms.ModelForm):
    class Meta:
        model = Country
        fields = ['name', 'iso_code', 'region', 'income_level', 'population', 'gdp_per_capita']
        widgets = {
            'population': forms.NumberInput(attrs={'min': '0'}),
            'gdp_per_capita': forms.NumberInput(attrs={'step': '0.01', 'min': '0'}),
        }

class SectorForm(forms.ModelForm):
    class Meta:
        model = Sector
        fields = ['code', 'name', 'category', 'description']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

class ImplementingOrganizationForm(forms.ModelForm):
    class Meta:
        model = ImplementingOrganization
        fields = ['name', 'org_type', 'country', 'contact_email', 'website']


# User Profile Management Forms

class UserProfileForm(forms.ModelForm):
    """Form for editing user profile information"""
    
    class Meta:
        model = UserProfile
        fields = [
            'title', 'first_name', 'middle_name', 'last_name', 'position', 
            'organizational_affiliation', 'phone', 'bio',
            'profile_picture', 'years_experience', 'specializations', 'languages', 
            'email_notifications', 'dashboard_layout'
        ]
        
        widgets = {
            'specializations': forms.Textarea(attrs={'rows': 2, 'placeholder': 'e.g., Health, Education, Water & Sanitation'}),
            'languages': forms.Textarea(attrs={'rows': 2, 'placeholder': 'e.g., English, French, Spanish'}),
            'years_experience': forms.NumberInput(attrs={'min': '0', 'max': '50'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+1-234-567-8900'}),
            'profile_picture': forms.ClearableFileInput(attrs={'class': 'form-control', 'accept': 'image/*'}),
            'organizational_affiliation': forms.Select(attrs={'class': 'form-select'}),
            'title': forms.Select(attrs={'class': 'form-select'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Your first name'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Your middle name (optional)'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Your last name'}),
            'position': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Your current job title or role'}),
        }
        
        labels = {
            'first_name': 'First Name',
            'middle_name': 'Middle Name',
            'last_name': 'Last Name',
            'organizational_affiliation': 'Organizational Affiliation',
            'years_experience': 'Years of Experience',
            'specializations': 'Areas of Expertise',
            'languages': 'Languages Spoken',
            'email_notifications': 'Receive Email Notifications',
            'dashboard_layout': 'Preferred Dashboard Layout',
            'profile_picture': 'Profile Picture',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'form-horizontal'
        self.helper.label_class = 'col-lg-3'
        self.helper.field_class = 'col-lg-9'
        
        # Set up organization choices
        self.fields['organizational_affiliation'].queryset = Organization.objects.filter(is_active=True).order_by('name')
        self.fields['organizational_affiliation'].empty_label = "Select Organization"
        
        self.helper.layout = Layout(
            TabHolder(
                Tab('Personal Information',
                    Fieldset(
                        'Basic Details',
                        Row(
                            Column('title', css_class='form-group col-md-3 mb-0'),
                            Column('first_name', css_class='form-group col-md-3 mb-0'),
                            Column('middle_name', css_class='form-group col-md-3 mb-0'),
                            Column('last_name', css_class='form-group col-md-3 mb-0'),
                            css_class='form-row'
                        ),
                        Row(
                            Column('position', css_class='form-group col-md-6 mb-0'),
                            Column('phone', css_class='form-group col-md-6 mb-0'),
                            css_class='form-row'
                        ),
                        'organizational_affiliation',
                    )
                ),
                Tab('Professional Details',
                    Fieldset(
                        'Experience & Expertise',
                        'years_experience',
                        'specializations',
                        'languages',
                    )
                ),
                Tab('Preferences',
                    Fieldset(
                        'System Preferences',
                        'email_notifications',
                        'dashboard_layout',
                    )
                ),
            ),
            HTML('<hr>'),
            Submit('submit', 'Update Profile', css_class='btn btn-primary btn-lg')
        )


class OrganizationForm(forms.ModelForm):
    """Form for creating/editing organizations"""
    
    class Meta:
        model = Organization
        fields = [
            'name', 'short_name', 'organization_type', 'description', 
            'website', 'logo_url', 'contact_email', 'contact_phone', 
            'address', 'country'
        ]
        
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
            'address': forms.Textarea(attrs={'rows': 3}),
            'website': forms.URLInput(attrs={'placeholder': 'https://example.org'}),
            'logo_url': forms.URLInput(attrs={'placeholder': 'https://example.org/logo.png'}),
            'contact_email': forms.EmailInput(attrs={'placeholder': 'contact@example.org'}),
            'contact_phone': forms.TextInput(attrs={'placeholder': '+1-234-567-8900'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'form-horizontal'
        self.helper.label_class = 'col-lg-3'
        self.helper.field_class = 'col-lg-9'
        
        self.helper.layout = Layout(
            Fieldset(
                'Organization Details',
                Row(
                    Column('name', css_class='form-group col-md-8 mb-0'),
                    Column('short_name', css_class='form-group col-md-4 mb-0'),
                    css_class='form-row'
                ),
                Row(
                    Column('organization_type', css_class='form-group col-md-6 mb-0'),
                    Column('country', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
                'description',
            ),
            Fieldset(
                'Contact Information',
                Row(
                    Column('contact_email', css_class='form-group col-md-6 mb-0'),
                    Column('contact_phone', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
                'address',
                Row(
                    Column('website', css_class='form-group col-md-6 mb-0'),
                    Column('logo_url', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
            ),
            HTML('<hr>'),
            Submit('submit', 'Save Organization', css_class='btn btn-primary btn-lg')
        )


class RoleForm(forms.ModelForm):
    """Form for creating/editing roles"""
    
    class Meta:
        model = Role
        fields = [
            'name', 'description', 'category',
            'can_create_projects', 'can_edit_own_projects', 'can_edit_org_projects',
            'can_approve_projects', 'can_view_analytics', 'can_export_data',
            'can_manage_users', 'can_manage_organization'
        ]
        
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'form-horizontal'
        self.helper.label_class = 'col-lg-3'
        self.helper.field_class = 'col-lg-9'
        
        self.helper.layout = Layout(
            Fieldset(
                'Role Details',
                Row(
                    Column('name', css_class='form-group col-md-8 mb-0'),
                    Column('category', css_class='form-group col-md-4 mb-0'),
                    css_class='form-row'
                ),
                'description',
            ),
            Fieldset(
                'Permissions',
                HTML('<h5>Project Management</h5>'),
                Row(
                    Column('can_create_projects', css_class='form-group col-md-6 mb-0'),
                    Column('can_edit_own_projects', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
                Row(
                    Column('can_edit_org_projects', css_class='form-group col-md-6 mb-0'),
                    Column('can_approve_projects', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
                HTML('<h5>Data & Analytics</h5>'),
                Row(
                    Column('can_view_analytics', css_class='form-group col-md-6 mb-0'),
                    Column('can_export_data', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
                HTML('<h5>Administration</h5>'),
                Row(
                    Column('can_manage_users', css_class='form-group col-md-6 mb-0'),
                    Column('can_manage_organization', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
            ),
            HTML('<hr>'),
            Submit('submit', 'Save Role', css_class='btn btn-primary btn-lg')
        )


class UserRoleForm(forms.ModelForm):
    """Form for assigning roles to users"""
    
    class Meta:
        model = UserRole
        fields = [
            'organization', 'role', 'is_primary', 'start_date', 'end_date', 'notes'
        ]
        
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'end_date': forms.DateInput(attrs={'type': 'date'}),
            'notes': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        # Filter organizations to active ones
        self.fields['organization'].queryset = Organization.objects.filter(is_active=True)
        self.fields['role'].queryset = Role.objects.filter(is_active=True)
        
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_class = 'form-horizontal'
        self.helper.label_class = 'col-lg-3'
        self.helper.field_class = 'col-lg-9'
        
        self.helper.layout = Layout(
            Fieldset(
                'Role Assignment',
                Row(
                    Column('organization', css_class='form-group col-md-6 mb-0'),
                    Column('role', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
                'is_primary',
                Row(
                    Column('start_date', css_class='form-group col-md-6 mb-0'),
                    Column('end_date', css_class='form-group col-md-6 mb-0'),
                    css_class='form-row'
                ),
                'notes',
            ),
            HTML('<hr>'),
            Submit('submit', 'Assign Role', css_class='btn btn-primary btn-lg')
        )

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise ValidationError("End date must be after start date.")
        
        return cleaned_data


class OrganizationSearchForm(forms.Form):
    """Form for searching organizations"""
    search = forms.CharField(
        max_length=200, 
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Search organizations...',
            'class': 'form-control'
        })
    )
    organization_type = forms.ChoiceField(
        choices=[('', 'All Types')] + Organization.ORG_TYPE_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    country = forms.ModelChoiceField(
        queryset=Country.objects.all(),
        required=False,
        empty_label="All Countries",
        widget=forms.Select(attrs={'class': 'form-control'})
    )

# IATI Import Forms

class IATIOrganizationImportForm(forms.Form):
    """Form for importing organization data from IATI Registry"""
    iati_identifier = forms.CharField(
        max_length=200,
        label="IATI Organization Identifier",
        help_text="Enter an IATI organization identifier (e.g., 44000 for World Bank, GB-GOV-1 for UK DFID, US-GOV-1 for USAID)",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'e.g., 44000, GB-GOV-1, US-GOV-1, NL-KVK-41198677'
        })
    )
    
    def clean_iati_identifier(self):
        identifier = self.cleaned_data['iati_identifier'].strip()
        
        if not identifier:
            raise forms.ValidationError("IATI identifier is required.")
        
        # Basic validation - allow various formats
        if len(identifier) < 2:
            raise forms.ValidationError("IATI identifier must be at least 2 characters long.")
        
        # Allow alphanumeric characters, hyphens, and underscores
        import re
        if not re.match(r'^[A-Za-z0-9\-_]+$', identifier):
            raise forms.ValidationError("IATI identifier can only contain letters, numbers, hyphens, and underscores.")
        
        return identifier

class ProjectLocationForm(forms.ModelForm):
    """Form for managing project locations"""
    
    # Separate address fields for better organization
    organization_street_number = forms.CharField(max_length=20, required=False, label="Street Number")
    organization_street_name = forms.CharField(max_length=200, required=False, label="Street Name")
    organization_city = forms.CharField(max_length=100, required=False, label="City")
    organization_postcode = forms.CharField(max_length=20, required=False, label="Postcode")
    organization_state_province = forms.CharField(max_length=100, required=False, label="State/Province")
    organization_country = forms.ModelChoiceField(
        queryset=Country.objects.all().order_by('name'),
        required=False,
        empty_label="Select Country",
        label="Country"
    )
    
    class Meta:
        model = ProjectLocation
        fields = [
            'location_type', 'name', 'notes', 'latitude', 'longitude',
            'admin_units', 'boundary_geojson', 'managed_by', 'organization_name',
            'has_physical_site', 'site_type', 'impact_scope'
        ]
        
        widgets = {
            'location_type': forms.Select(attrs={'class': 'form-select'}),
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter location name'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'latitude': forms.NumberInput(attrs={'class': 'form-control', 'step': 'any', 'readonly': True}),
            'longitude': forms.NumberInput(attrs={'class': 'form-control', 'step': 'any', 'readonly': True}),
            'admin_units': forms.SelectMultiple(attrs={'class': 'form-select'}),
            'managed_by': forms.Select(attrs={'class': 'form-select'}),
            'organization_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Organization name'}),
            'has_physical_site': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'site_type': forms.Select(attrs={'class': 'form-select'}),
            'impact_scope': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Set up admin units queryset
        self.fields['admin_units'].queryset = AdminUnit.objects.select_related('country').order_by('country__name', 'admin_level', 'name')
        
        # If editing existing location, populate address fields
        if self.instance and self.instance.pk and self.instance.organization_address:
            # Try to parse existing address into components
            address_parts = self.instance.organization_address.split('\n')
            if len(address_parts) >= 1:
                # Simple parsing - you might want to make this more sophisticated
                street_parts = address_parts[0].split(' ', 1)
                if len(street_parts) >= 2 and street_parts[0].isdigit():
                    self.fields['organization_street_number'].initial = street_parts[0]
                    self.fields['organization_street_name'].initial = street_parts[1]
                else:
                    self.fields['organization_street_name'].initial = address_parts[0]
            
            if len(address_parts) >= 2:
                self.fields['organization_city'].initial = address_parts[1]
            if len(address_parts) >= 3:
                self.fields['organization_postcode'].initial = address_parts[2]
            if len(address_parts) >= 4:
                self.fields['organization_state_province'].initial = address_parts[3]
            if len(address_parts) >= 5:
                # Try to find the country by name
                country_name = address_parts[4]
                try:
                    country = Country.objects.get(name__iexact=country_name)
                    self.fields['organization_country'].initial = country
                except Country.DoesNotExist:
                    # If country not found, leave it empty
                    pass
        
        # Add CSS classes and attributes for address fields
        address_fields = [
            'organization_street_number', 'organization_street_name', 
            'organization_city', 'organization_postcode', 
            'organization_state_province'
        ]
        
        for field_name in address_fields:
            self.fields[field_name].widget.attrs.update({
                'class': 'form-control',
                'data-address-component': field_name.replace('organization_', '')
            })
        
        # Special handling for country dropdown
        self.fields['organization_country'].widget.attrs.update({
            'class': 'form-select',
            'data-address-component': 'country'
        })

    def save(self, commit=True):
        instance = super().save(commit=False)
        
        # Combine address fields into organization_address
        address_parts = []
        
        street_number = self.cleaned_data.get('organization_street_number', '').strip()
        street_name = self.cleaned_data.get('organization_street_name', '').strip()
        if street_number and street_name:
            address_parts.append(f"{street_number} {street_name}")
        elif street_name:
            address_parts.append(street_name)
        
        city = self.cleaned_data.get('organization_city', '').strip()
        if city:
            address_parts.append(city)
            
        postcode = self.cleaned_data.get('organization_postcode', '').strip()
        if postcode:
            address_parts.append(postcode)
            
        state_province = self.cleaned_data.get('organization_state_province', '').strip()
        if state_province:
            address_parts.append(state_province)
            
        country = self.cleaned_data.get('organization_country')
        if country:
            address_parts.append(str(country))  # Convert Country model to string
        
        instance.organization_address = '\n'.join(address_parts)
        
        if commit:
            instance.save()
            self.save_m2m()
        return instance

class AdminUnitForm(forms.ModelForm):
    """Form for managing administrative units"""
    
    class Meta:
        model = AdminUnit
        fields = ['name', 'admin_level', 'parent', 'country', 'code', 'latitude', 'longitude', 'population', 'area_km2']
        
        widgets = {
            'latitude': forms.NumberInput(attrs={'step': '0.0000001'}),
            'longitude': forms.NumberInput(attrs={'step': '0.0000001'}),
            'population': forms.NumberInput(attrs={'min': '0'}),
            'area_km2': forms.NumberInput(attrs={'step': '0.01', 'min': '0'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Filter parent choices based on country and admin level
        if 'country' in self.data:
            try:
                country_id = int(self.data.get('country'))
                self.fields['parent'].queryset = AdminUnit.objects.filter(country_id=country_id)
            except (ValueError, TypeError):
                pass
        elif self.instance.pk and self.instance.country:
            self.fields['parent'].queryset = AdminUnit.objects.filter(country=self.instance.country)

# Location management formset
ProjectLocationFormSet = forms.inlineformset_factory(
    AidProject,
    ProjectLocation,
    form=ProjectLocationForm,
    extra=0,
    can_delete=True,
    fields=['location_type', 'name', 'notes', 'latitude', 'longitude', 'admin_units', 'managed_by', 'organization_name', 'organization_address', 'has_physical_site', 'site_type', 'impact_scope']
)

# Additional formsets for project management
ProjectBudgetFormSet = forms.inlineformset_factory(
    AidProject,
    ProjectBudget,
    form=ProjectBudgetForm,
    extra=1,
    can_delete=True
)

ProjectMilestoneFormSet = forms.inlineformset_factory(
    AidProject,
    ProjectMilestone,
    form=ProjectMilestoneForm,
    extra=1,
    can_delete=True
)

ProjectDocumentFormSet = forms.inlineformset_factory(
    AidProject,
    ProjectDocument,
    form=ProjectDocumentForm,
    extra=1,
    can_delete=True
)