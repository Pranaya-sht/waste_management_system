from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from .models import Complaint, Profile
from .serializers import ComplaintSerializer, UserSerializer
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

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