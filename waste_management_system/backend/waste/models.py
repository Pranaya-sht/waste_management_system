from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Complaint(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
    ]
    
    user = models.CharField(max_length=100)
    description = models.TextField()
    location = models.CharField(max_length=255)
    picture = models.ImageField(upload_to='complaint_pics/', blank=True, null=True)
    video = models.FileField(upload_to='complaint_videos/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Complaint by {self.user} - {self.status}"
    
class Profile(models.Model):
    ROLE_CHOICES = [
        ("Citizen", "Citizen"),
        ("Worker", "Worker"),
        ("Admin", "Admin"),
         ("Superuser", "Superuser"),]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="Citizen")
    is_approved = models.BooleanField(default=False)
    
    email = models.EmailField(max_length=254, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    def __str__(self):
        return f"{self.user.username} ({self.role})"
    
# @receiver(post_save, sender=User)
# def create_user_profile(sender, instance, created, **kwargs):
#     if created:
#         # Default role: Citizen
#         role = "Citizen"

#         # If user is superuser, mark them as Superuser and approved
#         if instance.is_superuser:
#             role = "Superuser"

#         profile = Profile.objects.create(
#             user=instance,
#             role=role,
#             is_approved=True  # Superuser is automatically approved
#         )

# @receiver(post_save, sender=User)
# def save_user_profile(sender, instance, **kwargs):
#     if hasattr(instance, 'profile'):
#         instance.profile.save() 
        

# @receiver(post_save, sender=User)
# def create_user_profile(sender, instance, created, **kwargs):
#     if created:
#         if instance.is_superuser:
#             # Mark superuser distinctly
#             Profile.objects.create(user=instance, role="Superuser", is_approved=True)
#         else:
#             Profile.objects.create(user=instance)
