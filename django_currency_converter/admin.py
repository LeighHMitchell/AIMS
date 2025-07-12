from django.contrib import admin
from django.contrib.admin import helpers
from django.db import transaction
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import path, reverse
from django.utils.html import format_html
from django.contrib import messages
from .models import ExchangeRateCache, SupportedCurrency
from .services.currency_converter import converter


@admin.register(SupportedCurrency)
class SupportedCurrencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_supported', 'last_checked']
    list_filter = ['is_supported', 'last_checked']
    search_fields = ['code', 'name']
    readonly_fields = ['last_checked', 'created_at']
    actions = ['refresh_currency_support']

    def refresh_currency_support(self, request, queryset):
        """Refresh currency support status from API"""
        try:
            supported_currencies = converter.get_supported_currencies(refresh=True)
            count = len(supported_currencies)
            self.message_user(
                request,
                f"Successfully refreshed {count} supported currencies from API.",
                messages.SUCCESS
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error refreshing currencies: {e}",
                messages.ERROR
            )

    refresh_currency_support.short_description = "Refresh currency support from API"


@admin.register(ExchangeRateCache)
class ExchangeRateCacheAdmin(admin.ModelAdmin):
    list_display = ['currency', 'date', 'rate_to_usd', 'created_at']
    list_filter = ['currency', 'date', 'created_at']
    search_fields = ['currency']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'

    def get_queryset(self, request):
        return super().get_queryset(request).order_by('-date', 'currency')


class TransactionAdmin(admin.ModelAdmin):
    """Enhanced Transaction admin with USD conversion features"""
    
    list_display = [
        'id', 'activity', 'transaction_type', 'value_display', 'currency', 
        'usd_value_display', 'usd_convertible', 'transaction_date'
    ]
    list_filter = [
        'currency', 'usd_convertible', 'transaction_type', 'transaction_date'
    ]
    search_fields = ['activity__title', 'currency']
    readonly_fields = [
        'value_usd', 'exchange_rate_used', 'usd_conversion_date', 'usd_convertible'
    ]
    actions = ['convert_to_usd', 'mark_unconvertible']

    def value_display(self, obj):
        """Display formatted original value"""
        if obj.value:
            return f"{obj.value:,.2f}"
        return "-"
    value_display.short_description = "Value"

    def usd_value_display(self, obj):
        """Display formatted USD value with conversion info"""
        if obj.value_usd:
            html = f"<strong>${obj.value_usd:,.2f}</strong>"
            if obj.exchange_rate_used:
                html += f"<br><small>Rate: {obj.exchange_rate_used}</small>"
            return format_html(html)
        elif obj.currency == 'USD':
            return format_html("<em>Same as original</em>")
        elif not obj.usd_convertible:
            return format_html('<span style="color: red;">Not convertible</span>')
        else:
            return format_html('<span style="color: orange;">Not converted</span>')
    usd_value_display.short_description = "USD Value"

    def convert_to_usd(self, request, queryset):
        """Admin action to convert selected transactions to USD"""
        convertible_transactions = queryset.filter(
            value_usd__isnull=True,
            value__gt=0
        ).exclude(currency='USD')
        
        if not convertible_transactions.exists():
            self.message_user(
                request,
                "No transactions found that need USD conversion.",
                messages.WARNING
            )
            return

        converted = 0
        skipped = 0
        errors = 0

        for txn in convertible_transactions:
            try:
                if not converter.is_currency_supported(txn.currency):
                    txn.mark_unconvertible()
                    skipped += 1
                    continue

                # Get conversion date (prefer value_date for IATI compliance)
                conversion_date = getattr(txn, 'value_date', None) or txn.transaction_date
                if hasattr(conversion_date, 'date'):
                    conversion_date = conversion_date.date()

                usd_amount, exchange_rate = converter.convert_to_usd(
                    txn.value, txn.currency, conversion_date
                )

                if usd_amount is None:
                    txn.mark_unconvertible()
                    skipped += 1
                else:
                    txn.set_usd_value(usd_amount, exchange_rate)
                    converted += 1

            except Exception as e:
                errors += 1
                self.message_user(
                    request,
                    f"Error converting transaction {txn.id}: {e}",
                    messages.ERROR
                )

        # Summary message
        if converted > 0:
            self.message_user(
                request,
                f"Successfully converted {converted} transactions to USD.",
                messages.SUCCESS
            )
        if skipped > 0:
            self.message_user(
                request,
                f"Skipped {skipped} transactions (unsupported currency or conversion failed).",
                messages.WARNING
            )

    convert_to_usd.short_description = "Convert selected transactions to USD"

    def mark_unconvertible(self, request, queryset):
        """Admin action to mark transactions as unconvertible"""
        updated = queryset.update(
            usd_convertible=False,
            usd_conversion_date=timezone.now()
        )
        self.message_user(
            request,
            f"Marked {updated} transactions as unconvertible to USD.",
            messages.SUCCESS
        )

    mark_unconvertible.short_description = "Mark as unconvertible to USD"

    def get_urls(self):
        """Add custom admin URLs"""
        urls = super().get_urls()
        custom_urls = [
            path(
                'bulk-convert/',
                self.admin_site.admin_view(self.bulk_convert_view),
                name='transaction_bulk_convert'
            ),
        ]
        return custom_urls + urls

    def bulk_convert_view(self, request):
        """Custom admin view for bulk USD conversion"""
        if request.method == 'POST':
            # Process the bulk conversion
            form_data = request.POST
            
            # Get filter criteria
            currency_filter = form_data.get('currency', '')
            date_from = form_data.get('date_from', '')
            date_to = form_data.get('date_to', '')
            
            # Build queryset
            qs = Transaction.objects.filter(
                value_usd__isnull=True,
                value__gt=0
            ).exclude(currency='USD')
            
            if currency_filter:
                qs = qs.filter(currency=currency_filter)
            if date_from:
                qs = qs.filter(transaction_date__gte=date_from)
            if date_to:
                qs = qs.filter(transaction_date__lte=date_to)
            
            # Process conversion
            self.convert_to_usd(request, qs)
            
            return HttpResponseRedirect(reverse('admin:transactions_transaction_changelist'))
        
        # GET request - show the form
        context = {
            'title': 'Bulk Convert Transactions to USD',
            'currencies': Transaction.objects.exclude(currency='USD').values_list(
                'currency', flat=True
            ).distinct().order_by('currency'),
            'opts': self.model._meta,
            'has_change_permission': True,
        }
        
        return render(request, 'admin/transaction_bulk_convert.html', context)


# Register the enhanced admin if Transaction model exists
# (Uncomment the line below if you want to register it directly)
# admin.site.register(Transaction, TransactionAdmin)