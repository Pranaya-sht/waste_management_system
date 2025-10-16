from rest_framework.permissions import BasePermission

class IsApproved(BasePermission):
    """
    Custom permission to only allow approved users to access certain views.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated and approved
        return request.user and request.user.is_authenticated and request.user.profile.is_approved