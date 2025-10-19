from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
# -------------------------------
# Complaint Model
# -------------------------------
class Complaint(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Expired', 'Expired'),
    ]

    WASTE_CHOICES = [
        ('Organic', 'Organic'),
        ('Plastic', 'Plastic'),
        ('Construction', 'Construction'),
        ('Other', 'Other'),
    ]

    QUANTITY_CHOICES = [
        ('Light', 'Light'),
        ('Medium', 'Medium'),
        ('Heavy', 'Heavy'),
    ]

    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='complaints',
        on_delete=models.CASCADE,
        null=True,  # allow NULL for old rows
        blank=True
    )
    assigned_worker = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='single_assigned_complaints'
)
    title = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField(blank=True)
    waste_type = models.CharField(
        max_length=50,
        choices=WASTE_CHOICES,
        null=True,  # allow NULL for old rows
        blank=True
    )
    quantity = models.CharField(
        max_length=20,
        choices=QUANTITY_CHOICES,
        default='Light'
    )
    location_lat = models.FloatField(blank=True, null=True)
    location_lng = models.FloatField(blank=True, null=True)
    picture = models.ImageField(upload_to='complaint_pics/', blank=True, null=True)
    video = models.FileField(upload_to='complaint_videos/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    desired_cleanup_time = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    interested_workers = models.ManyToManyField(User, related_name="interested_complaints", blank=True)
    assigned_workers = models.ManyToManyField(
    User,
    blank=True,
    related_name='multi_assigned_complaints'
    )
    def check_and_expire(self):
        """Automatically expire if pending > 5 hours"""
        if self.status == 'Pending' and self.created_at <= timezone.now() - timedelta(hours=5):
            self.status = 'Expired'
            self.save()
            
    def __str__(self):
        citizen_name = self.citizen.username if self.citizen else "Unknown"
        return f"Complaint by {citizen_name} - {self.status}"


# class ComplaintImage(models.Model):
#     image = models.ImageField(upload_to="complaint_pics/")

# class ComplaintVideo(models.Model):
#     video = models.FileField(upload_to="complaint_videos/")
# -------------------------------
# Profile Model
# -------------------------------
class Profile(models.Model):
    ROLE_CHOICES = [
        ("Citizen", "Citizen"),
        ("Worker", "Worker"),
        ("Admin", "Admin"),
        ("Superuser", "Superuser"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="Citizen")
    is_approved = models.BooleanField(default=False)

    email = models.EmailField(max_length=254, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)

    # Rating fields
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

# -------------------------------
# Rating Model
# -------------------------------
class Rating(models.Model):
    complaint = models.OneToOneField(Complaint, on_delete=models.CASCADE, null=True, blank=True)
    worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    citizen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings_given',
        null=True,
        blank=True
    )
    rating = models.PositiveSmallIntegerField(default=0)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.worker and hasattr(self.worker, 'profile'):
            self.worker.profile.update_rating(self.rating)

# -------------------------------
# Message Model
# -------------------------------
class Message(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages', null=True, blank=True)
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages', null=True, blank=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        sender_name = self.sender.username if self.sender else "Unknown"
        receiver_name = self.receiver.username if self.receiver else "Unknown"
        return f"Message from {sender_name} to {receiver_name}"

# -------------------------------
# ComplaintMedia Model
# -------------------------------
class ComplaintMedia(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='media', null=True, blank=True)
    media_type = models.CharField(max_length=10, choices=[('Photo','Photo'),('Video','Video')], default='Photo')
    file = models.FileField(upload_to='complaint_media/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
