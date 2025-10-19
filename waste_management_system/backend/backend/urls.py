
from django.contrib import admin
from django.urls import path
from django.urls import include, path
from rest_framework import routers
from waste.views import ComplaintViewSet ,UserViewSet,ProfileViewSet, RatingViewSet, MessageViewSet, ComplaintMediaViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from waste import views
from waste.views import CustomTokenObtainPairView

from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter

from waste.views import AdminAnalyticsView
router = routers.DefaultRouter()
router.register(r'complaints', ComplaintViewSet)
router.register(r'users', UserViewSet)
router.register(r'profiles', ProfileViewSet)
router.register(r'ratings', RatingViewSet)
router.register(r'messages', MessageViewSet)
router.register(r'media', ComplaintMediaViewSet)
urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/users/me/", views.get_current_user, name="get_current_user"),
    path("api/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/workers/<int:worker_id>/rate/", views.rate_worker, name="rate_worker"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"), 
    path("api/users/profile/", views.user_profile, name="user_profile"),
    path('api/users/<int:user_id>/profile/', views.get_user_profile, name='get_user_profile'),  
    path('api/admin/analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),

    # ✅ Move these two ABOVE router.include
    path('api/complaints/categories/', views.complaint_categories, name="complaint-categories"),
    path('api/complaints/stats/', views.complaint_stats, name="complaint-stats"),

    # Must come AFTER manual endpoints
    path('api/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)