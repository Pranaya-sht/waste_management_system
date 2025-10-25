import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Message, Complaint

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"chat_{self.room_name}"

        # Extract complaint ID if room_name starts with "complaint_"
        if self.room_name.startswith("complaint_"):
            self.complaint_id = self.room_name.split("_")[1]
        else:
            self.complaint_id = None

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        username = data['user']

        sender = await self.get_user(username)
        receiver = None  # You can later set logic to find assigned worker/admin

        if self.complaint_id:
            await self.save_message(sender, receiver, message, self.complaint_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
                "user": username,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "user": event["user"]
        }))

    @database_sync_to_async
    def get_user(self, username):
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, sender, receiver, message, complaint_id):
        complaint = Complaint.objects.get(id=complaint_id)
        Message.objects.create(
            complaint=complaint,
            sender=sender,
            receiver=receiver,
            message=message
        )
