from django.urls import reverse
from django.utils.html import format_html
from .models import AidProject

def breadcrumbs(request):
    """
    Context processor to generate breadcrumbs based on current URL
    """
    breadcrumbs_list = []
    
    # Get current path
    path = request.path
    resolver_match = request.resolver_match
    
    if not resolver_match:
        return {'breadcrumbs': breadcrumbs_list}
    
    url_name = resolver_match.url_name
    namespace = resolver_match.namespace
    kwargs = resolver_match.kwargs
    
    # Always start with Home
    breadcrumbs_list.append({
        'title': 'Home',
        'url': reverse('home'),
        'icon': 'fa-home'
    })
    
    # Don't show breadcrumbs on home page itself
    if url_name == 'home':
        return {'breadcrumbs': []}
    
    # Handle admin pages
    if path.startswith('/admin/'):
        breadcrumbs_list.append({
            'title': 'Administration',
            'url': '/admin/',
            'icon': 'fa-cog'
        })
        return {'breadcrumbs': breadcrumbs_list}
    
    # Handle different URL patterns
    if path.startswith('/projects/'):
        if url_name == 'project_dashboard':
            breadcrumbs_list.append({
                'title': 'Projects Dashboard',
                'url': reverse('project_dashboard'),
                'icon': 'fa-tachometer-alt'
            })
            
        elif url_name == 'analytics_dashboard':
            breadcrumbs_list.append({
                'title': 'Projects Dashboard',
                'url': reverse('project_dashboard'),
                'icon': 'fa-tachometer-alt'
            })
            breadcrumbs_list.append({
                'title': 'Analytics Dashboard',
                'url': reverse('analytics_dashboard'),
                'icon': 'fa-chart-bar'
            })
            
        elif url_name == 'submit_project':
            breadcrumbs_list.append({
                'title': 'Projects Dashboard',
                'url': reverse('project_dashboard'),
                'icon': 'fa-tachometer-alt'
            })
            
            # Check if we have a project context (for new projects being created)
            project = getattr(request, '_breadcrumb_project', None)
            if project and hasattr(project, 'id') and project.id:
                # This is a new project being created, show as "Activity Editor"
                breadcrumbs_list.append({
                    'title': 'Activity Editor',
                    'url': reverse('submit_project'),
                    'icon': 'fa-edit'
                })
            else:
                # This is the initial "Add New Activity" page
                breadcrumbs_list.append({
                    'title': 'Add New Activity',
                    'url': reverse('submit_project'),
                    'icon': 'fa-plus-circle'
                })
            
        elif url_name == 'project_detail':
            project_id = kwargs.get('project_id')
            breadcrumbs_list.append({
                'title': 'Projects Dashboard',
                'url': reverse('project_dashboard'),
                'icon': 'fa-tachometer-alt'
            })
            
            if project_id:
                try:
                    project = AidProject.objects.get(id=project_id)
                    project_title = project.title if project.title else f"Project {project.prism_id or project_id}"
                    # Truncate long titles for breadcrumbs
                    if len(project_title) > 40:
                        project_title = project_title[:37] + "..."
                    breadcrumbs_list.append({
                        'title': project_title,
                        'url': reverse('project_detail', kwargs={'project_id': project_id}),
                        'icon': 'fa-project-diagram'
                    })
                except AidProject.DoesNotExist:
                    breadcrumbs_list.append({
                        'title': f'Project {project_id}',
                        'url': reverse('project_detail', kwargs={'project_id': project_id}),
                        'icon': 'fa-project-diagram'
                    })
                    
        elif url_name == 'edit_project':
            project_id = kwargs.get('project_id')
            breadcrumbs_list.append({
                'title': 'Projects Dashboard',
                'url': reverse('project_dashboard'),
                'icon': 'fa-tachometer-alt'
            })
            
            if project_id:
                try:
                    project = AidProject.objects.get(id=project_id)
                    project_title = project.title if project.title else f"Project {project.prism_id or project_id}"
                    # Truncate long titles for breadcrumbs
                    if len(project_title) > 30:
                        project_title = project_title[:27] + "..."
                    breadcrumbs_list.append({
                        'title': project_title,
                        'url': reverse('project_detail', kwargs={'project_id': project_id}),
                        'icon': 'fa-project-diagram'
                    })
                    breadcrumbs_list.append({
                        'title': 'Activity Editor',
                        'url': reverse('edit_project', kwargs={'project_id': project_id}),
                        'icon': 'fa-edit'
                    })
                except AidProject.DoesNotExist:
                    breadcrumbs_list.append({
                        'title': f'Project {project_id}',
                        'url': reverse('project_detail', kwargs={'project_id': project_id}),
                        'icon': 'fa-project-diagram'
                    })
                    breadcrumbs_list.append({
                        'title': 'Activity Editor',
                        'url': reverse('edit_project', kwargs={'project_id': project_id}),
                        'icon': 'fa-edit'
                    })
                    
        elif url_name == 'export_projects':
            breadcrumbs_list.append({
                'title': 'Projects Dashboard',
                'url': reverse('project_dashboard'),
                'icon': 'fa-tachometer-alt'
            })
            breadcrumbs_list.append({
                'title': 'Export Projects',
                'url': reverse('export_projects'),
                'icon': 'fa-download'
            })
    
    # Handle import pages
    elif path.startswith('/projects/import/'):
        breadcrumbs_list.append({
            'title': 'Projects Dashboard',
            'url': reverse('project_dashboard'),
            'icon': 'fa-tachometer-alt'
        })
        
        if url_name == 'import_organizations':
            breadcrumbs_list.append({
                'title': 'Import Organization Data',
                'url': reverse('import_organizations'),
                'icon': 'fa-building'
            })
        elif url_name == 'import_activities':
            breadcrumbs_list.append({
                'title': 'Import Activity Data',
                'url': reverse('import_activities'),
                'icon': 'fa-project-diagram'
            })
        elif url_name == 'import_transactions':
            breadcrumbs_list.append({
                'title': 'Import Transaction Data',
                'url': reverse('import_transactions'),
                'icon': 'fa-exchange-alt'
            })
    
    # Handle user profile management pages
    elif path.startswith('/projects/profile/'):
        if url_name == 'user_profile':
            breadcrumbs_list.append({
                'title': 'My Profile',
                'url': reverse('user_profile'),
                'icon': 'fa-user'
            })
        elif url_name == 'edit_profile':
            breadcrumbs_list.append({
                'title': 'My Profile',
                'url': reverse('user_profile'),
                'icon': 'fa-user'
            })
            breadcrumbs_list.append({
                'title': 'Edit Profile',
                'url': reverse('edit_profile'),
                'icon': 'fa-edit'
            })
        elif url_name == 'manage_roles':
            breadcrumbs_list.append({
                'title': 'My Profile',
                'url': reverse('user_profile'),
                'icon': 'fa-user'
            })
            breadcrumbs_list.append({
                'title': 'Manage Roles',
                'url': reverse('manage_roles'),
                'icon': 'fa-users-cog'
            })
        elif url_name in ['add_role', 'edit_role']:
            breadcrumbs_list.append({
                'title': 'My Profile',
                'url': reverse('user_profile'),
                'icon': 'fa-user'
            })
            breadcrumbs_list.append({
                'title': 'Manage Roles',
                'url': reverse('manage_roles'),
                'icon': 'fa-users-cog'
            })
            if url_name == 'add_role':
                breadcrumbs_list.append({
                    'title': 'Add Role',
                    'url': reverse('add_role'),
                    'icon': 'fa-plus'
                })
            else:
                breadcrumbs_list.append({
                    'title': 'Edit Role',
                    'url': '#',
                    'icon': 'fa-edit'
                })
    
    # Handle organization pages
    elif path.startswith('/projects/organizations/'):
        if url_name == 'organization_directory':
            breadcrumbs_list.append({
                'title': 'Organizations',
                'url': reverse('organization_directory'),
                'icon': 'fa-building'
            })
        elif url_name == 'organization_detail':
            org_id = kwargs.get('org_id')
            breadcrumbs_list.append({
                'title': 'Organizations',
                'url': reverse('organization_directory'),
                'icon': 'fa-building'
            })
            if org_id:
                try:
                    from .models import Organization
                    org = Organization.objects.get(id=org_id)
                    org_name = org.short_name or org.name
                    if len(org_name) > 30:
                        org_name = org_name[:27] + "..."
                    breadcrumbs_list.append({
                        'title': org_name,
                        'url': reverse('organization_detail', kwargs={'org_id': org_id}),
                        'icon': 'fa-building'
                    })
                except:
                    breadcrumbs_list.append({
                        'title': f'Organization {org_id}',
                        'url': reverse('organization_detail', kwargs={'org_id': org_id}),
                        'icon': 'fa-building'
                    })
        elif url_name == 'create_organization':
            breadcrumbs_list.append({
                'title': 'Organizations',
                'url': reverse('organization_directory'),
                'icon': 'fa-building'
            })
            breadcrumbs_list.append({
                'title': 'Create Organization',
                'url': reverse('create_organization'),
                'icon': 'fa-plus'
            })
        elif url_name == 'edit_organization':
            org_id = kwargs.get('org_id')
            breadcrumbs_list.append({
                'title': 'Organizations',
                'url': reverse('organization_directory'),
                'icon': 'fa-building'
            })
            if org_id:
                try:
                    from .models import Organization
                    org = Organization.objects.get(id=org_id)
                    org_name = org.short_name or org.name
                    if len(org_name) > 25:
                        org_name = org_name[:22] + "..."
                    breadcrumbs_list.append({
                        'title': org_name,
                        'url': reverse('organization_detail', kwargs={'org_id': org_id}),
                        'icon': 'fa-building'
                    })
                    breadcrumbs_list.append({
                        'title': 'Edit',
                        'url': reverse('edit_organization', kwargs={'org_id': org_id}),
                        'icon': 'fa-edit'
                    })
                except:
                    breadcrumbs_list.append({
                        'title': 'Edit Organization',
                        'url': '#',
                        'icon': 'fa-edit'
                    })
    
    # Handle role directory
    elif url_name == 'role_directory':
        breadcrumbs_list.append({
            'title': 'Role Directory',
            'url': reverse('role_directory'),
            'icon': 'fa-user-tag'
        })
    
    return {'breadcrumbs': breadcrumbs_list} 