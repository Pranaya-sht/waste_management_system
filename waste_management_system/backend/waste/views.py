from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from .models import Complaint, Profile
from .serializers import ComplaintSerializer, UserSerializer, ProfileSerializer
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import Profile
from .permission import IsAdminUserCustom

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    if request.method == "GET":
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method == "PUT":
        serializer = UserSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserCustom] 
    
    @action(detail=False, methods=['get', 'put'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        profile = request.user.profile
        if request.method == 'GET':
            serializer = ProfileSerializer(profile)
            return Response(serializer.data)
        elif request.method == 'PUT':
            serializer = ProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Approve user ( worker)
    @action(detail=True, methods=['post'])
    def approve_worker(self, request, pk=None):
        approver = request.user
        target_user = self.get_object()
        target_profile = target_user.profile

        # Case 1: Worker approval — only admins can do this
        if target_profile.role == "Worker":
            if approver.profile.role != "Admin":
                return Response(
                    {"detail": "Only admins can approve workers."},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_profile.is_approved = True
            target_profile.save()
            return Response(
                {"message": f"✅ {target_user.username} approved successfully as Worker."},
                status=status.HTTP_200_OK
            )

        # Case 2: Admin approval — only superusers can do this
        elif target_profile.role == "Admin":
            if not approver.is_superuser:
                return Response(
                    {"detail": "Only superusers can approve admins."},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_profile.is_approved = True
            target_profile.save()
            return Response(
                {"message": f"✅ {target_user.username} approved successfully as Admin."},
                status=status.HTTP_200_OK
            )

        # Case 3: Other users
        return Response(
            {"detail": "This user type does not require approval."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    
    # 🔹 Admin unapproves (disables) a worker
    @action(detail=True, methods=["post"])
    def unapprove_worker(self, request, pk=None):
        if request.user.profile.role != "Admin":
            return Response({"detail": "Only admins can unapprove workers."}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        profile = user.profile

        if profile.role != "Worker":
            return Response({"detail": "Only workers can be unapproved."}, status=status.HTTP_400_BAD_REQUEST)
        
        profile.is_approved = False
        profile.save()
        return Response({"message": f"{user.username} has been unapproved and can no longer log in."})
        
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Block unapproved Admins or Workers
        if user.profile.role in ["Admin", "Worker"] and not user.profile.is_approved:
            raise serializers.ValidationError("Account not approved yet.")
        
        # Include role and approval info in response
        data["role"] = user.profile.role
        data["is_approved"] = user.profile.is_approved
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rate_worker(request, worker_id):
    """Allow citizens to rate workers (1–5 stars)."""
    try:
        worker = Profile.objects.get(user__id=worker_id, role="Worker")
    except Profile.DoesNotExist:
        return Response({"detail": "Worker not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user.profile.role != "Citizen":
        return Response({"detail": "Only citizens can rate workers."}, status=status.HTTP_403_FORBIDDEN)

    rating_value = request.data.get("rating")
    try:
        rating_value = float(rating_value)
    except (TypeError, ValueError):
        return Response({"detail": "Invalid rating value."}, status=status.HTTP_400_BAD_REQUEST)

    if rating_value < 1 or rating_value > 5:
        return Response({"detail": "Rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Update the worker's rating based on your model structure
    if hasattr(worker, 'rating_sum') and hasattr(worker, 'rating_count'):
        # If using sum/count system
        worker.rating_sum = getattr(worker, 'rating_sum', 0) + rating_value
        worker.rating_count = getattr(worker, 'rating_count', 0) + 1
        new_average = worker.rating_sum / worker.rating_count
    else:
        # If using direct average system
        current_rating = getattr(worker, 'rating', 0) or 0
        current_count = getattr(worker, 'rating_count', 0)
        total_score = current_rating * current_count
        worker.rating_count = current_count + 1
        new_average = (total_score + rating_value) / worker.rating_count
        worker.rating = new_average

    worker.save()

    return Response({
        "message": f"Rated {worker.user.username} with {rating_value} stars.",
        "new_average": round(new_average, 2),
    }, status=status.HTTP_200_OK)
    
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    profile = request.user.profile

    if request.method == "GET":
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method == "PUT":
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_profile(request, user_id):
    """Get public profile information for any user"""
    try:
        user = User.objects.get(id=user_id)
        profile = user.profile
        
        # Calculate rating average if rating_sum exists
        rating = 0
        rating_count = 0
        
        if hasattr(profile, 'rating_sum') and hasattr(profile, 'rating_count'):
            rating_count = profile.rating_count
            rating = profile.rating_sum / profile.rating_count if profile.rating_count > 0 else 0
        elif hasattr(profile, 'rating'):
            # If there's a direct rating field
            rating = profile.rating or 0
            rating_count = getattr(profile, 'rating_count', 0)
        
        # Return limited public information
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': profile.role,
            'bio': profile.bio,
            'phone_number': profile.phone_number,
            'profile_picture': profile.profile_picture.url if profile.profile_picture else None,
            'rating': round(rating, 2),
            'rating_count': rating_count,
            'is_approved': profile.is_approved,
            'date_joined': user.date_joined,
        }
        return Response(data)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)