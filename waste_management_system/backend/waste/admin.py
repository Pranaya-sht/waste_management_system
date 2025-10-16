from django.contrib import admin
from .models import Profile, Complaint

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
    
@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'location', 'created_at')
    list_filter = ('status',)
    search_fields = ('user', 'location')
