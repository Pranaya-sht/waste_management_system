from rest_framework import serializers
from .models import Complaint, Profile, Message, ComplaintMedia
from django.contrib.auth.models import User

from .models import Rating  # make sure Rating model exists
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'
        
class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    is_approved = serializers.BooleanField(source='profile.is_approved', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'is_approved']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        validated_data.pop("groups", None)
        validated_data.pop("user_permissions", None)
        password = validated_data.pop("password")

        # Create the user
        user = User.objects.create_user(password=password, **validated_data)

        # Make sure a Profile exists for this user
        profile, created = Profile.objects.get_or_create(user=user)

        # Determine the requested role
        requested_role = self.initial_data.get("role", "Citizen")

        # Assign correct role and approval logic
        if user.is_superuser:
            profile.role = "Superuser"
            profile.is_approved = True
        elif requested_role == "Admin":
            profile.role = "Admin"
            profile.is_approved = False  # needs Superuser approval
        elif requested_role == "Worker":
            profile.role = "Worker"
            profile.is_approved = False  # needs Admin approval
        else:
            profile.role = "Citizen"
            profile.is_approved = True  # ✅ Auto-approved citizen

        profile.save()
        return user



def update(self, instance, validated_data):
    profile_data = validated_data.pop('profile', {})
    profile = instance.profile

    instance.username = validated_data.get('username', instance.username)
    instance.email = validated_data.get('email', instance.email)
    instance.save()

    profile.role = profile_data.get('role', profile.role)
    profile.phone_number = profile_data.get('phone_number', profile.phone_number)
    profile.bio = profile_data.get('bio', profile.bio)
    # ✅ Handle image file correctly
    profile_picture = profile_data.get('profile_picture')
    if profile_picture:
        profile.profile_picture = profile_picture
    profile.save()

    return instance

 
class ComplaintSerializer(serializers.ModelSerializer):
    picture_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = "__all__"
        read_only_fields = ["status", "citizen", "assigned_worker", "created_at", "updated_at"]
    def get_picture_url(self, obj):
        if obj.picture:
            return self.context['request'].build_absolute_uri(obj.picture.url)
        return None

    def get_video_url(self, obj):
        if obj.video:
            return self.context['request'].build_absolute_uri(obj.video.url)
        return None

       
        
class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Profile
        fields = "__all__"
        read_only_fields = ["rating", "total_ratings", "rating_sum"]
        
class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        
class ComplaintMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintMedia
        fields = '__all__'
        
class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = '__all__'