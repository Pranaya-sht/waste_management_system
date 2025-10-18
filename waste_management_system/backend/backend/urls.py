"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.urls import include, path
from rest_framework import routers
from waste.views import ComplaintViewSet ,UserViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from waste import views
from waste.views import CustomTokenObtainPairView

from django.conf import settings
from django.conf.urls.static import static

router = routers.DefaultRouter()
router.register(r'complaints', ComplaintViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/users/me/", views.get_current_user, name="get_current_user"),
    path('api/', include(router.urls)) ,
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/workers/<int:worker_id>/rate/", views.rate_worker, name="rate_worker"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"), 
    path("api/users/profile/", views.user_profile, name="user_profile"),
    path('api/users/<int:user_id>/profile/', views.get_user_profile, name='get_user_profile'),  
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
