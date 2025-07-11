from django.contrib import admin
from .models import (
    Donor, Country, Sector, ImplementingOrganization, 
    AidProject, ProjectBudget, ProjectMilestone, ProjectDocument
)

@admin.register(Donor)
class DonorAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'donor_type', 'country', 'created_at']
    list_filter = ['donor_type', 'country']
    search_fields = ['name', 'code', 'country']
    ordering = ['name']

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['name', 'iso_code', 'region', 'income_level', 'population']
    list_filter = ['region', 'income_level']
    search_fields = ['name', 'iso_code']
    ordering = ['name']

@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'category']
    list_filter = ['category']
    search_fields = ['code', 'name', 'category']
    ordering = ['code']

@admin.register(ImplementingOrganization)
class ImplementingOrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'org_type', 'country']
    list_filter = ['org_type', 'country']
    search_fields = ['name']
    ordering = ['name']

class ProjectBudgetInline(admin.TabularInline):
    model = ProjectBudget
    extra = 1

class ProjectMilestoneInline(admin.TabularInline):
    model = ProjectMilestone
    extra = 1

class ProjectDocumentInline(admin.TabularInline):
    model = ProjectDocument
    extra = 1

@admin.register(AidProject)
class AidProjectAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'donor', 'recipient_country', 'activity_status', 
        'funding_amount', 'currency', 'start_date_planned', 'end_date_planned'
    ]
    list_filter = [
        'activity_status', 'donor', 'recipient_country', 'sector', 
        'collaboration_type', 'default_flow_type', 'default_finance_type',
        'default_modality', 'default_modality_override'
    ]
    search_fields = ['title', 'iati_identifier', 'description']
    date_hierarchy = 'submitted_at'
    ordering = ['-submitted_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('iati_identifier', 'title', 'description')
        }),
        ('Organizations', {
            'fields': ('donor', 'implementing_org')
        }),
        ('Status and Timeline', {
            'fields': (
                'activity_status', 
                ('start_date_planned', 'end_date_planned'),
                ('start_date_actual', 'end_date_actual')
            )
        }),
        ('Location', {
            'fields': ('recipient_country', 'sub_national_location')
        }),
        ('Classification', {
            'fields': ('sector', 'collaboration_type')
        }),
        ('Financial Information', {
            'fields': (
                ('total_budget', 'funding_amount', 'currency'),
                'default_flow_type', 'default_finance_type', 
                'default_aid_type', 'default_tied_status',
                'default_modality', 'default_modality_override'
            )
        }),
        ('Beneficiaries and Impact', {
            'fields': (
                ('target_beneficiaries', 'actual_beneficiaries'),
                'results_description', 'impact_assessment'
            )
        }),
        ('Additional Information', {
            'fields': ('contact_info', 'document_link', 'partner_activity_id'),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('created_by', 'submitted_at', 'updated_at'),
            'classes': ('collapse',),
        })
    )
    
    readonly_fields = ['submitted_at', 'updated_at']
    inlines = [ProjectBudgetInline, ProjectMilestoneInline, ProjectDocumentInline]

@admin.register(ProjectBudget)
class ProjectBudgetAdmin(admin.ModelAdmin):
    list_display = ['project', 'category', 'planned_amount', 'actual_amount', 'currency']
    list_filter = ['category', 'currency']
    search_fields = ['project__title', 'category', 'description']

@admin.register(ProjectMilestone)
class ProjectMilestoneAdmin(admin.ModelAdmin):
    list_display = ['project', 'title', 'planned_date', 'actual_date', 'status']
    list_filter = ['status', 'planned_date']
    search_fields = ['project__title', 'title', 'description']
    date_hierarchy = 'planned_date'

@admin.register(ProjectDocument)
class ProjectDocumentAdmin(admin.ModelAdmin):
    list_display = ['project', 'title', 'document_type', 'uploaded_at', 'uploaded_by']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['project__title', 'title']
    date_hierarchy = 'uploaded_at'
