from django.contrib import admin
from .models import Complaint, Profile, Rating, Message, ComplaintMedia

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'is_approved', 'email', 'phone_number')
    list_filter = ('role', 'is_approved')
    search_fields = ('user__username', 'email')

    def approval_status(self, obj):
        return "✅ Approved" if obj.is_approved else "⏳ Pending"
    approval_status.short_description = "Status"
    
    def approve_selected(self, request, queryset):
        queryset.update(is_approved=True)
        self.message_user(request, "✅ Selected users have been approved.")

    def unapprove_selected(self, request, queryset):
        queryset.update(is_approved=False)
        self.message_user(request, "🚫 Selected users have been unapproved.")
    
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('id', 'citizen', 'assigned_worker', 'status', 'created_at', 'display_location')
    list_filter = ('status', 'waste_type', 'quantity')
    search_fields = ('citizen__username', 'assigned_worker__username', 'title', 'description')

    def display_location(self, obj):
        if obj.location_lat and obj.location_lng:
            return f"{obj.location_lat}, {obj.location_lng}"
        return "N/A"
    display_location.short_description = 'Location'

admin.site.register(Complaint, ComplaintAdmin)


class RatingAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'worker', 'citizen', 'rating', 'created_at')
    search_fields = ('worker__username', 'citizen__username', 'complaint__title')

admin.site.register(Rating, RatingAdmin)

class MessageAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'sender', 'receiver', 'created_at')
    search_fields = ('sender__username', 'receiver__username', 'complaint__title')

admin.site.register(Message, MessageAdmin)

class ComplaintMediaAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'media_type', 'file', 'uploaded_at')

admin.site.register(ComplaintMedia, ComplaintMediaAdmin)
