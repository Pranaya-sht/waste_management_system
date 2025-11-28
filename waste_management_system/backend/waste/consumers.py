import json
import re
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Message, Complaint

User = get_user_model()
logger = logging.getLogger(__name__)

class BaseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not self.scope["user"].is_authenticated:
            logger.info("Rejecting WS connect: unauthenticated scope user=%r path=%r", self.scope.get('user'), self.scope.get('path'))
            await self.close()
            return
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

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "sender": event["sender"],
            "timestamp": event["timestamp"],
            "message_type": event["message_type"]
        }))

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

class ComplaintChatConsumer(BaseConsumer):
    async def connect(self):
        # Support both new routing param `complaint_id` and older `room_name`
        kwargs = self.scope.get('url_route', {}).get('kwargs', {})
        raw_id = kwargs.get('complaint_id') or kwargs.get('room_name')

        # Normalize: extract digits if the value contains a prefix like 'complaint_27'
        self.complaint_id = None
        if raw_id is not None:
            m = re.search(r"(\d+)", str(raw_id))
            if m:
                try:
                    self.complaint_id = int(m.group(1))
                except (TypeError, ValueError):
                    self.complaint_id = None

        if not self.complaint_id:
            # invalid or missing complaint id: reject connection
            logger.warning(
                "Rejecting WS connect: invalid or missing complaint id raw=%r path=%r user=%r",
                raw_id,
                self.scope.get('path'),
                self.scope.get('user'),
            )
            await self.close()
            return

        # Build the group name using the numeric complaint id
        self.room_group_name = f"complaint_chat_{self.complaint_id}"

        # verify complaint exists before accepting
        complaint = await database_sync_to_async(Complaint.objects.filter(id=self.complaint_id).first)()
        if not complaint:
            # Reject connection if complaint doesn't exist
            logger.warning(
                "Rejecting WS connect: complaint id %s not found; user=%r path=%r",
                self.complaint_id,
                self.scope.get('user'),
                self.scope.get('path'),
            )
            await self.close()
            return

        # store complaint object for later use
        self.complaint = complaint

        await super().connect()
         # ✅ Mark messages as read when joining
        await self.mark_messages_as_read(self.scope["user"])

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        sender = self.scope["user"]
        # Save the message
        saved_message = await self.save_message(sender, message)

        # If saving failed (e.g. complaint disappeared), don't proceed
        if saved_message is None:
            # optionally: notify sender about failure
            logger.warning("Failed to save message for complaint_id=%r user=%r", getattr(self, 'complaint_id', None), self.scope.get('user'))
            await self.send(text_data=json.dumps({
                "error": "Complaint does not exist or could not save message." 
            }))
            return

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
                "sender": sender.username,
                "timestamp": saved_message.created_at.isoformat(),
                "message_type": "complaint"
            }
        )

    @database_sync_to_async
    def save_message(self, sender, message_text):
        if getattr(self, 'complaint', None) is None:
            try:
                complaint = Complaint.objects.get(id=self.complaint_id)
            except Complaint.DoesNotExist:
                return None
        else:
            complaint = self.complaint

        # Detect receiver:
        if sender == complaint.citizen:
            receiver = complaint.assigned_worker
        else:
            receiver = complaint.citizen

        return Message.objects.create(
            complaint=complaint,
            sender=sender,
            receiver=receiver,
            message=message_text,
            message_type='complaint'
        )
        
    @database_sync_to_async
    def mark_messages_as_read(self, user):
        Message.objects.filter(
            complaint=self.complaint,
            receiver=user,
            is_read=False
        ).update(is_read=True)

        
    @database_sync_to_async
    def mark_messages_as_read(self, user):
        # Mark all messages sent TO this user as read
        Message.objects.filter(
            complaint=self.complaint,
            receiver=user,
            is_read=False
        ).update(is_read=True)

class DirectChatConsumer(BaseConsumer):
    async def connect(self):
        self.other_user_id = self.scope['url_route']['kwargs']['user_id']
        user_ids = sorted([str(self.scope["user"].id), self.other_user_id])
        self.room_group_name = f"direct_chat_{'_'.join(user_ids)}"
        await super().connect()

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        sender = self.scope["user"]
        receiver = await self.get_user(self.other_user_id)

        if not receiver:
            return
        
        # Save the message
        saved_message = await self.save_message(sender, receiver, message)
        
        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
                "sender": sender.username,
                "timestamp": saved_message.created_at.isoformat(),
                "message_type": "direct"
            }
        )

    @database_sync_to_async
    def save_message(self, sender, receiver, message_text):
        return Message.objects.create(
            sender=sender,
            receiver=receiver,
            message=message_text,
            message_type='direct'
        )