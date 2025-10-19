from django.core.management.base import BaseCommand
from django.utils import timezone
from waste.models import Complaint
from datetime import timedelta

class Command(BaseCommand):
    help = 'Expire complaints not accepted within 5 hours'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        expiration_time = now - timedelta(hours=5)
        expired_complaints = Complaint.objects.filter(status='Pending', created_at__lte=expiration_time)
        count = expired_complaints.update(status='Expired')
        self.stdout.write(self.style.SUCCESS(f'{count} complaints expired.'))
