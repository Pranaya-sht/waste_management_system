from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User

class ApprovedUserBackend(ModelBackend):
    """
    Custom authentication backend that allows only approved users to authenticate.
    """
    def user_can_authenticate(self, user:User):
       is_active = super().user_can_authenticate(user)
       
       return is_active and hasattr(user, 'profile') and user.profile.is_approved
   