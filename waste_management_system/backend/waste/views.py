from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import viewsets, status, permissions
from .models import Complaint, Profile, Rating, Message, ComplaintMedia
from .serializers import ComplaintSerializer, ProfileSerializer, RatingSerializer, MessageSerializer, ComplaintMediaSerializer,UserSerializer
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import Profile
from .permission import IsAdminUserCustom
from rest_framework.views import APIView
from django.db import models
from django.db.models import Avg, Count, Q
from rest_framework.decorators import api_view
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

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




# ----------------------------
# Complaint ViewSet (with workflow)
# ----------------------------


@api_view(['GET'])
def complaint_categories(request):
    """Return available complaint categories and priorities"""
    categories = {
        "Organic": "Organic Waste",
        "Plastic": "Plastic Waste",
        "Construction": "Construction Debris",
        "Other": "Other Waste Types",
    }
    priorities = {
        "Light": "Light",
        "Medium": "Medium",
        "Heavy": "Heavy",
    }
    return Response({"categories": categories, "priorities": priorities})


@api_view(['GET'])
def complaint_stats(request):
    """Return basic complaint statistics"""
    total = Complaint.objects.count()
    pending = Complaint.objects.filter(status="Pending").count()
    in_progress = Complaint.objects.filter(status="Accepted").count()
    completed = Complaint.objects.filter(status="Completed").count()
    expired = Complaint.objects.filter(status="Expired").count()

    resolution_rate = int((completed / total) * 100) if total > 0 else 0

    return Response({
        "total_complaints": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "expired": expired,
        "resolution_rate": resolution_rate,
    })

class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser] 
    
    
    def get_queryset(self):
        complaints = Complaint.objects.all()
        for c in complaints:
                c.check_and_expire()
        user = self.request.user
        profile = user.profile
        if profile.role == "Citizen":
                return complaints.filter(citizen=user)
        elif profile.role == "Worker":
            return complaints.filter(
        Q(assigned_worker=user) | Q(status='Pending')
    )
        elif profile.role == "Admin":
                return complaints
        return Complaint.objects.none()
    
    def retrieve(self, request, *args, **kwargs):
        complaint = self.get_object()
        complaint.check_and_expire()  # Expire if needed
        serializer = self.get_serializer(complaint)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)
 # Worker: Accept complaint
    # @action(detail=True, methods=['post'])
    # def accept(self, request, pk=None):
    #     complaint = self.get_object()
    #     complaint.check_and_expire()  # ✅ Check expiration before accepting

    #     if complaint.status == 'Expired':
    #         return Response({"error": "Cannot accept. Complaint has expired."}, status=400)

    #     if request.user.profile.role != "Worker":
    #         return Response({"error": "Only workers can accept complaints"}, status=403)
    #     if complaint.status != 'Pending':
    #         return Response({"error": "Complaint already assigned"}, status=400)

    #     complaint.assigned_worker = request.user
    #     complaint.status = 'Accepted'
    #     complaint.save()
    #     return Response({"success": "Complaint accepted"})

    # Worker: Update status
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        complaint = self.get_object()
        new_status = request.data.get('status')
        complaint.check_and_expire()  # ✅ Check expiration before updating

        if complaint.status == 'Expired':
            return Response({"error": "Cannot update. Complaint has expired."}, status=400)

        status_update = request.data.get('status')
        valid_status  = ["Accepted", "In Progress", "Completed", "Denied", "Incomplete"]
        if status_update not in valid_status:
            return Response({"error": f"Invalid status. Must be one of {valid_status}"}, status=400)
       
        complaint.status = status_update
        complaint.save()
        return Response({"success": f"Complaint status updated to {status_update}"})
    
    
    # Citizen: Rate worker
    @action(detail=True, methods=['post'])
    def rate_worker(self, request, pk=None):
        """Citizens can rate the worker who completed their complaint"""
        complaint = self.get_object()
        complaint.check_and_expire()  # ✅ ensure expiration check

        # Ensure complaint is valid for rating
        if complaint.status != "Completed":
            return Response({"error": "You can only rate completed complaints."}, status=400)
        if not complaint.assigned_worker:
            return Response({"error": "This complaint was never assigned to a worker."}, status=400)

        # Prevent duplicate rating
        if Rating.objects.filter(complaint=complaint, citizen=request.user).exists():
            return Response({"error": "You have already rated this complaint."}, status=400)

        # Create the rating
        rating_value = request.data.get("rating")
        comment = request.data.get("comment", "")
        if not rating_value:
            return Response({"error": "Please provide a rating value."}, status=400)

        rating = Rating.objects.create(
            complaint=complaint,
            worker=complaint.assigned_worker,
            citizen=request.user,
            rating=int(rating_value),
            comment=comment,
        )

        return Response({
            "success": "Rating submitted successfully.",
            "worker": complaint.assigned_worker.username,
            "rating": rating.rating,
            "comment": rating.comment
        })
        
        
    @action(detail=False, methods=['get'], url_path='admin-analytics')
    def admin_analytics(self, request):
        """Admin-only analytics summary"""
        if not request.user.is_staff:
            return Response({"error": "You are not authorized to view this data."}, status=403)

        # Complaint counts by status
        status_counts = Complaint.objects.values('status').annotate(count=Count('id'))

        # Average worker rating
        avg_rating = Profile.objects.filter(role="Worker").aggregate(Avg('rating'))['rating__avg'] or 0.0

        # Top 5 workers by rating
        top_workers = Profile.objects.filter(role="Worker").order_by('-rating')[:5]
        top_worker_data = [
            {"username": worker.user.username, "rating": worker.rating, "total_ratings": worker.total_ratings}
            for worker in top_workers
        ]

        data = {
            "total_complaints": Complaint.objects.count(),
            "status_breakdown": {item['status']: item['count'] for item in status_counts},
            "average_worker_rating": round(avg_rating, 2),
            "top_workers": top_worker_data,
        }

        return Response(data)
        
    # Worker expresses interest
    @action(detail=True, methods=['post'])
    def express_interest(self, request, pk=None):
        complaint = self.get_object()
        if request.user.profile.role != "Worker":
            return Response({"error": "Only workers can express interest."}, status=403)
        if complaint.status != "Pending":
            return Response({"error": "Complaint not open for interest."}, status=400)
        complaint.interested_workers.add(request.user)
        return Response({"success": "Interest recorded."})

    # Citizen assigns one or more workers
    @action(detail=True, methods=['post'])
    def assign_workers(self, request, pk=None):
        complaint = self.get_object()
        if request.user != complaint.citizen:
            return Response({"error": "Only the complaint owner can assign workers."}, status=403)
        
        worker_ids = request.data.get("worker_ids", [])
        if not worker_ids:
            return Response({"error": "Please select at least one worker."}, status=400)

        workers = User.objects.filter(id__in=worker_ids, profile__role="Worker")
        if not workers.exists():
            return Response({"error": "Invalid workers selected."}, status=400)

        complaint.assigned_workers.set(workers)
        complaint.status = "Accepted"
        complaint.save()
        return Response({"success": "Workers assigned successfully."})
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        complaint = self.get_object()
        complaint.check_and_expire()  # ✅ Check expiration before accepting

        worker_lat = request.data.get('worker_lat')
        worker_lng = request.data.get('worker_lng')
        if complaint.status == 'Expired':
            return Response({"error": "Cannot accept. Complaint has expired."}, status=400)

        if request.user.profile.role != "Worker":
            return Response({"error": "Only workers can accept complaints"}, status=403)
        if complaint.status != 'Pending':
            return Response({"error": "Complaint already assigned"}, status=400)

        worker_lat = request.data.get('worker_lat')
        worker_lng = request.data.get('worker_lng')

        if not worker_lat or not worker_lng:
            return Response({"error": "Location required"}, status=400)

        # ✅ Save worker info & update complaint status
        complaint.assigned_worker = request.user
        complaint.worker_lat = worker_lat
        complaint.worker_lng = worker_lng
        complaint.status = 'Accepted'
        complaint.save()

        return Response({"success": "Complaint accepted successfully"}, status=200)





class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
# permission_classes = [IsAdminUserCustom] 
    
    def get_permissions(self):
        # Allow anyone to register (POST)
        if self.action in ['create']:
            permission_classes = [AllowAny]
        # Allow authenticated users to view/update their profile
        elif self.action in ['profile']:
            permission_classes = [IsAuthenticated]
        # Only Admin or Superuser for approval actions
        elif self.action in ['approve_worker', 'unapprove_worker']:
            permission_classes = [IsAuthenticated]
        else:
            # Default to authenticated for everything else
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
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
    
    

# ----------------------------
# Profile ViewSet
# ----------------------------
class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    @action(detail=True, methods=['post'])
    def approve_worker(self, request, pk=None):
        profile = self.get_object()
        if profile.role != "Worker":
            return Response({"error": "Only workers can be approved"}, status=400)
        profile.is_approved = True
        profile.save()
        return Response({"success": f"{profile.user.username} approved"})

    @action(detail=True, methods=['post'])
    def suspend_worker(self, request, pk=None):
        profile = self.get_object()
        if profile.role != "Worker":
            return Response({"error": "Only workers can be suspended"}, status=400)
        profile.is_approved = False
        profile.save()
        return Response({"success": f"{profile.user.username} suspended"})


# ----------------------------
# Rating ViewSet
# ----------------------------
class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer

# ----------------------------
# Message ViewSet
# ----------------------------

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    # Send a message
    @action(detail=False, methods=['post'])
    def send(self, request):
        complaint_id = request.data.get('complaint_id')
        receiver_id = request.data.get('receiver_id')
        message_text = request.data.get('message')

        try:
            complaint = Complaint.objects.get(id=complaint_id)
            receiver = User.objects.get(id=receiver_id)
        except Complaint.DoesNotExist:
            return Response({"error": "Complaint not found"}, status=404)
        except User.DoesNotExist:
            return Response({"error": "Receiver not found"}, status=404)

        msg = Message.objects.create(
            complaint=complaint,
            sender=request.user,
            receiver=receiver,
            message=message_text
        )
        return Response({"success": "Message sent", "message_id": msg.id})

    # Get messages for a complaint
    @action(detail=False, methods=['get'])
    def thread(self, request):
        complaint_id = request.query_params.get('complaint_id')
        try:
            complaint = Complaint.objects.get(id=complaint_id)
        except Complaint.DoesNotExist:
            return Response({"error": "Complaint not found"}, status=404)

        messages = Message.objects.filter(complaint=complaint).order_by('created_at')
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)
# ----------------------------
# Complaint Media ViewSet
# ----------------------------
class ComplaintMediaViewSet(viewsets.ModelViewSet):
    queryset = ComplaintMedia.objects.all()
    serializer_class = ComplaintMediaSerializer
    
    

class AdminAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        if profile.role != "Admin":
            return Response({"error": "Only admins can access analytics"}, status=403)

        total_complaints = Complaint.objects.count()
        status_counts = Complaint.objects.values('status').order_by('status').annotate(count=models.Count('id'))

        # Average rating per worker
        worker_profiles = Profile.objects.filter(role='Worker')
        worker_ratings = [
            {
                "worker": worker.user.username,
                "rating": worker.rating,
                "total_ratings": worker.total_ratings
            }
            for worker in worker_profiles
        ]

        data = {
            "total_complaints": total_complaints,
            "status_counts": list(status_counts),
            "worker_ratings": worker_ratings,
        }
        return Response(data)