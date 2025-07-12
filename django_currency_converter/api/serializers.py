from rest_framework import serializers
from ..models import SupportedCurrency, ExchangeRateCache
from ..services.currency_converter import converter

# Import your actual Transaction model
# from your_app.models import Transaction


class SupportedCurrencySerializer(serializers.ModelSerializer):
    """Serializer for supported currencies"""
    
    class Meta:
        model = SupportedCurrency
        fields = ['code', 'name', 'is_supported']


class TransactionSerializer(serializers.ModelSerializer):
    """Enhanced Transaction serializer with USD conversion info"""
    
    value_usd_formatted = serializers.SerializerMethodField()
    conversion_status = serializers.SerializerMethodField()
    exchange_rate_display = serializers.SerializerMethodField()
    is_currency_supported = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'activity', 'transaction_type', 'value', 'currency',
            'transaction_date', 'value_usd', 'value_usd_formatted',
            'usd_convertible', 'conversion_status', 'exchange_rate_used',
            'exchange_rate_display', 'usd_conversion_date', 'is_currency_supported'
        ]
        read_only_fields = [
            'value_usd', 'usd_convertible', 'usd_conversion_date',
            'exchange_rate_used'
        ]

    def get_value_usd_formatted(self, obj):
        """Return formatted USD value"""
        if obj.value_usd:
            return f"${obj.value_usd:,.2f}"
        return None

    def get_conversion_status(self, obj):
        """Return human-readable conversion status"""
        if obj.currency == 'USD':
            return "native_usd"
        elif obj.value_usd:
            return "converted"
        elif not obj.usd_convertible:
            return "unconvertible"
        else:
            return "pending"

    def get_exchange_rate_display(self, obj):
        """Return formatted exchange rate"""
        if obj.exchange_rate_used:
            return f"1 {obj.currency} = {obj.exchange_rate_used} USD"
        return None

    def get_is_currency_supported(self, obj):
        """Check if the currency is supported for conversion"""
        return converter.is_currency_supported(obj.currency)


class CurrencyConversionRequestSerializer(serializers.Serializer):
    """Serializer for manual currency conversion requests"""
    
    transaction_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of transaction IDs to convert"
    )
    force_reconvert = serializers.BooleanField(
        default=False,
        help_text="Force reconversion even if USD value already exists"
    )


class CurrencyListResponseSerializer(serializers.Serializer):
    """Response serializer for currency list endpoint"""
    
    supported_currencies = SupportedCurrencySerializer(many=True)
    total_count = serializers.IntegerField()
    last_updated = serializers.DateTimeField()


class ConversionStatsSerializer(serializers.Serializer):
    """Serializer for conversion statistics"""
    
    total_transactions = serializers.IntegerField()
    converted_transactions = serializers.IntegerField()
    unconvertible_transactions = serializers.IntegerField()
    pending_transactions = serializers.IntegerField()
    usd_transactions = serializers.IntegerField()
    conversion_rate = serializers.FloatField()
    
    currencies_breakdown = serializers.DictField(
        child=serializers.DictField(),
        help_text="Breakdown by currency with counts and conversion status"
    )