from django.db import models
from django.utils import timezone
from decimal import Decimal


class ExchangeRateCache(models.Model):
    """Cache for historical exchange rates to avoid repeated API calls"""
    currency = models.CharField(max_length=3, help_text='ISO 4217 currency code')
    date = models.DateField(help_text='Date for the exchange rate')
    rate_to_usd = models.DecimalField(
        max_digits=20, 
        decimal_places=6, 
        help_text='Exchange rate to USD (how many USD for 1 unit of currency)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('currency', 'date')
        indexes = [
            models.Index(fields=['currency', 'date'], name='currency_date_idx'),
        ]

    def __str__(self):
        return f"{self.currency} -> USD on {self.date}: {self.rate_to_usd}"


class SupportedCurrency(models.Model):
    """List of currencies supported by our exchange rate API"""
    code = models.CharField(max_length=3, unique=True, help_text='ISO 4217 currency code')
    name = models.CharField(max_length=100, help_text='Currency name')
    is_supported = models.BooleanField(
        default=True, 
        help_text='Whether this currency is supported by our API'
    )
    last_checked = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        status = "✓" if self.is_supported else "✗"
        return f"{status} {self.code} - {self.name}"

    @classmethod
    def get_supported_codes(cls):
        """Return list of supported currency codes"""
        return list(cls.objects.filter(is_supported=True).values_list('code', flat=True))

    @classmethod
    def is_currency_supported(cls, currency_code):
        """Check if a currency is supported"""
        try:
            currency = cls.objects.get(code=currency_code.upper())
            return currency.is_supported
        except cls.DoesNotExist:
            return False


# Transaction model extensions to be added to your existing Transaction model
class TransactionCurrencyMixin:
    """
    Mixin to add USD conversion functionality to your existing Transaction model.
    Add these methods to your Transaction model:
    """
    
    def needs_usd_conversion(self):
        """Check if this transaction needs USD conversion"""
        return (
            self.value_usd is None and 
            self.currency != 'USD' and
            self.value is not None and
            self.value > 0
        )

    def mark_unconvertible(self):
        """Mark this transaction as unconvertible to USD"""
        self.usd_convertible = False
        self.usd_conversion_date = timezone.now()
        self.save(update_fields=['usd_convertible', 'usd_conversion_date'])

    def set_usd_value(self, usd_amount, exchange_rate):
        """Set the USD value and related metadata"""
        self.value_usd = usd_amount
        self.exchange_rate_used = exchange_rate
        self.usd_conversion_date = timezone.now()
        self.usd_convertible = True
        self.save(update_fields=[
            'value_usd', 
            'exchange_rate_used', 
            'usd_conversion_date', 
            'usd_convertible'
        ])


# Example of how to extend your existing Transaction model:
"""
# In your existing Transaction model, add these fields and methods:

class Transaction(models.Model):
    # Your existing fields...
    
    # New USD conversion fields (add via migration)
    value_usd = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Transaction value converted to USD using historical exchange rate'
    )
    usd_convertible = models.BooleanField(
        default=True,
        help_text='Indicates if the currency can be converted to USD'
    )
    usd_conversion_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when USD conversion was performed'
    )
    exchange_rate_used = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='Exchange rate used for USD conversion'
    )
    
    # Add the mixin methods
    def needs_usd_conversion(self):
        return (
            self.value_usd is None and 
            self.currency != 'USD' and
            self.value is not None and
            self.value > 0
        )

    def mark_unconvertible(self):
        self.usd_convertible = False
        self.usd_conversion_date = timezone.now()
        self.save(update_fields=['usd_convertible', 'usd_conversion_date'])

    def set_usd_value(self, usd_amount, exchange_rate):
        self.value_usd = usd_amount
        self.exchange_rate_used = exchange_rate
        self.usd_conversion_date = timezone.now()
        self.usd_convertible = True
        self.save(update_fields=[
            'value_usd', 
            'exchange_rate_used', 
            'usd_conversion_date', 
            'usd_convertible'
        ])
"""