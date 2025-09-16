from django import template
from django.urls import reverse
from django.utils.safestring import mark_safe

register = template.Library()

@register.simple_tag(takes_context=True)
def custom_breadcrumbs(context, *breadcrumbs):
    """
    Custom template tag to override breadcrumbs in specific templates
    Usage: {% custom_breadcrumbs "Home|home|fa-home" "Dashboard|project_dashboard|fa-tachometer-alt" %}
    """
    breadcrumb_list = []
    
    for breadcrumb in breadcrumbs:
        parts = breadcrumb.split('|')
        if len(parts) >= 3:
            title, url_name, icon = parts[0], parts[1], parts[2]
            try:
                url = reverse(url_name)
                breadcrumb_list.append({
                    'title': title,
                    'url': url,
                    'icon': icon
                })
            except:
                # If URL reverse fails, just add the title without URL
                breadcrumb_list.append({
                    'title': title,
                    'url': '#',
                    'icon': icon
                })
    
    # Store in context for template use
    context['custom_breadcrumbs'] = breadcrumb_list
    return ''

@register.inclusion_tag('breadcrumbs/breadcrumb_nav.html', takes_context=True)
def render_breadcrumbs(context):
    """
    Inclusion tag to render breadcrumbs with custom template
    """
    breadcrumbs = context.get('custom_breadcrumbs') or context.get('breadcrumbs', [])
    return {'breadcrumbs': breadcrumbs}

@register.simple_tag
def breadcrumb_item(title, url_name=None, icon='fa-circle', **kwargs):
    """
    Simple tag to create a single breadcrumb item
    Usage: {% breadcrumb_item "Dashboard" "project_dashboard" "fa-tachometer-alt" %}
    """
    try:
        url = reverse(url_name, kwargs=kwargs) if url_name else '#'
    except:
        url = '#'
    
    return {
        'title': title,
        'url': url,
        'icon': icon
    } 