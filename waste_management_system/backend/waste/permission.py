from rest_framework.permissions import BasePermission

class IsApproved(BasePermission):
    """
    Custom permission to only allow approved users to access certain views.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated and approved
        return request.user and request.user.is_authenticated and request.user.profile.is_approved
    
    
class IsAdminUserCustom(BasePermission):
    """
    Allows access only to users with role 'Admin'.
    """
    def has_permission(self, request, view):
        # Ensure the user is authenticated and has a profile
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and
            request.user.profile.role == "Admin"
        )