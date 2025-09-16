"""
API views for frontend integration
These views replace Supabase functionality with Django backend
"""
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import transaction
from .models import Organization, UserProfile, Role, UserRole

def get_user_data(user):
    """Helper function to format user data for frontend"""
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        # Create profile if it doesn't exist
        profile = UserProfile.objects.create(user=user)
    
    # Get user's organization through organizational_affiliation
    organization = None
    organization_id = None
    if profile.organizational_affiliation:
        # Try to find organization by name
        try:
            org = Organization.objects.filter(name=profile.organizational_affiliation).first()
            if org:
                organization = {
                    'id': str(org.id),
                    'name': org.name,
                    'type': org.organization_type
                }
                organization_id = str(org.id)
        except:
            pass
    
    # Get user's role from permission_level or UserRole
    role = 'member'  # default role
    if user.is_superuser:
        role = 'admin'
    elif profile.permission_level:
        # Map permission levels to roles
        permission_map = {
            'admin': 'admin',
            'editor': 'dev_partner_tier_1',
            'viewer': 'member'
        }
        role = permission_map.get(profile.permission_level, 'member')
    else:
        # Check UserRole table
        try:
            user_role = UserRole.objects.filter(user=user, is_active=True).first()
            if user_role and user_role.role:
                role = user_role.role.name.lower()
        except:
            pass
    
    # Build name from profile if available, otherwise from user
    name = user.username
    if profile.first_name or profile.last_name:
        name = f"{profile.first_name or ''} {profile.last_name or ''}".strip()
    elif user.first_name or user.last_name:
        name = f"{user.first_name} {user.last_name}".strip()
    
    return {
        'id': str(user.id),
        'email': user.email,
        'name': name,
        'role': role,
        'organization_id': organization_id,
        'organization': organization,
        'telephone': profile.phone or '',
        'phone': profile.phone or '',  # For backward compatibility
        'department': '',  # Extract from position if needed
        'jobTitle': profile.title or '',
        'profilePicture': str(profile.profile_picture) if profile.profile_picture else '',
        'created_at': user.date_joined.isoformat(),
        'updated_at': profile.updated_at.isoformat() if profile.updated_at else user.date_joined.isoformat(),
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'is_active': user.is_active
    }

@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def api_users(request):
    """Main API endpoint for user management"""
    
    if request.method == 'GET':
        email = request.GET.get('email')
        
        if email:
            # Get specific user by email
            try:
                user = User.objects.get(email=email)
                return JsonResponse(get_user_data(user))
            except User.DoesNotExist:
                return JsonResponse({'error': 'User not found'}, status=404)
        else:
            # Get all users
            users = User.objects.all().order_by('first_name', 'last_name', 'username')
            users_data = [get_user_data(user) for user in users]
            return JsonResponse(users_data, safe=False)
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name', '')
            email = data.get('email')
            role = data.get('role', 'member')
            organization_id = data.get('organization_id')
            
            if not email:
                return JsonResponse({'error': 'Email is required'}, status=400)
            
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                return JsonResponse({'error': 'User with this email already exists'}, status=409)
            
            # Create user
            username = email.split('@')[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Split name into first and last
            name_parts = name.split(' ', 1) if name else ['', '']
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name
                )
                
                # Set role
                if role == 'admin':
                    user.is_superuser = True
                    user.is_staff = True
                    user.save()
                
                # Create profile
                profile = UserProfile.objects.create(user=user)
                
                # Set organization if provided
                if organization_id:
                    try:
                        org = Organization.objects.get(id=organization_id)
                        profile.organizational_affiliation = org.name
                        profile.save()
                    except Organization.DoesNotExist:
                        # Create user without organization
                        pass
                
                # Set user role
                if role != 'admin':
                    try:
                        role_obj = Role.objects.get(name__iexact=role)
                        UserRole.objects.create(user=user, role=role_obj)
                    except Role.DoesNotExist:
                        # Default role will be used
                        pass
            
            return JsonResponse(get_user_data(user), status=201)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            user_id = data.get('id')
            email = data.get('email')
            
            # Try to find user by email first (more reliable)
            if email:
                try:
                    user = User.objects.get(email=email)
                except User.DoesNotExist:
                    return JsonResponse({'error': 'User not found'}, status=404)
            elif user_id:
                # Try numeric ID first, then fallback to treating it as email
                try:
                    # Check if it's a numeric ID
                    if str(user_id).isdigit():
                        user = User.objects.get(id=int(user_id))
                    else:
                        # Maybe it's a UUID or email, try by email
                        user = User.objects.get(email=user_id)
                except User.DoesNotExist:
                    return JsonResponse({'error': 'User not found'}, status=404)
                except ValueError:
                    return JsonResponse({'error': 'Invalid user ID'}, status=400)
            else:
                return JsonResponse({'error': 'User ID or email is required'}, status=400)
            
            # Update user fields
            if 'name' in data:
                name_parts = data['name'].split(' ', 1)
                user.first_name = name_parts[0]
                user.last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            if 'email' in data:
                # Check if email is already taken by another user
                if User.objects.filter(email=data['email']).exclude(id=user.id).exists():
                    return JsonResponse({'error': 'Email already in use'}, status=409)
                user.email = data['email']
            
            # Update role
            if 'role' in data:
                if data['role'] == 'admin':
                    user.is_superuser = True
                    user.is_staff = True
                else:
                    user.is_superuser = False
                    user.is_staff = False
            
            user.save()
            
            # Update profile
            try:
                profile = user.profile
            except UserProfile.DoesNotExist:
                profile = UserProfile.objects.create(user=user)
                
            # Update profile fields if provided
            profile_updated = False
            
            # Update names in profile
            if 'name' in data:
                name_parts = data['name'].split(' ', 1)
                profile.first_name = name_parts[0]
                profile.last_name = name_parts[1] if len(name_parts) > 1 else ''
                profile_updated = True
                
            if 'telephone' in data:
                profile.phone = data['telephone']
                profile_updated = True
                
            if 'department' in data:
                # UserProfile doesn't have department, but we can store in position
                profile.position = data.get('jobTitle', '') + (' - ' + data['department'] if data.get('department') else '')
                profile_updated = True
                
            if 'jobTitle' in data:
                profile.title = data['jobTitle']
                profile_updated = True
                
            if 'profilePicture' in data:
                # Store data URL directly in the ImageField
                profile.profile_picture = data['profilePicture']
                profile_updated = True
                
            if 'organization_id' in data:
                if data['organization_id']:
                    try:
                        org = Organization.objects.get(id=data['organization_id'])
                        profile.organizational_affiliation = org.name
                        profile_updated = True
                    except Organization.DoesNotExist:
                        profile.organizational_affiliation = None
                        profile_updated = True
                else:
                    profile.organizational_affiliation = None
                    profile_updated = True
                    
            if profile_updated:
                profile.save()
            
            return JsonResponse(get_user_data(user))
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        user_id = request.GET.get('id')
        
        if not user_id:
            return JsonResponse({'error': 'User ID is required'}, status=400)
        
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return JsonResponse({'success': True})
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    """API endpoint for user login"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return JsonResponse({'error': 'Email and password are required'}, status=400)
        
        # Try to authenticate with email
        user = authenticate(request, username=email, password=password)
        
        # If that fails, try with username
        if not user:
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        
        if user:
            login(request, user)
            return JsonResponse({
                'user': get_user_data(user),
                'session_key': request.session.session_key
            })
        else:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_logout(request):
    """API endpoint for user logout"""
    logout(request)
    return JsonResponse({'success': True})

@csrf_exempt
def api_current_user(request):
    """API endpoint to get current authenticated user"""
    if request.user.is_authenticated:
        return JsonResponse(get_user_data(request.user))
    else:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def api_change_password(request):
    """API endpoint for changing password"""
    try:
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return JsonResponse({'error': 'Current and new passwords are required'}, status=400)
        
        # Verify current password
        if not request.user.check_password(current_password):
            return JsonResponse({'error': 'Current password is incorrect'}, status=401)
        
        # Set new password
        request.user.set_password(new_password)
        request.user.save()
        
        # Keep user logged in
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, request.user)
        
        return JsonResponse({'success': True, 'message': 'Password changed successfully'})
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500) 