import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Initialize Django before importing app modules that may import models
_django_app = get_asgi_application()

from waste.middleware import TokenAuthMiddlewareStack
from waste.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": _django_app,
    "websocket": TokenAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
