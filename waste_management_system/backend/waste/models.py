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
   
 #  New rating fields
    rating = models.FloatField(default=0.0)
    total_ratings = models.IntegerField(default=0)
    rating_sum = models.IntegerField(default=0)

    def update_rating(self, new_rating):
        """Update worker's average rating"""
        self.rating_sum += new_rating
        self.total_ratings += 1
        self.rating = self.rating_sum / self.total_ratings
        self.save()

    def __str__(self):
        return f"{self.user.username} ({self.role})"