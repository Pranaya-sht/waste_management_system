from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
	re_path(r"ws/chat/complaint/(?P<complaint_id>\d+)/$", consumers.ComplaintChatConsumer.as_asgi()),
	re_path(r"ws/chat/direct/(?P<user_id>\w+)/$", consumers.DirectChatConsumer.as_asgi()),
]
