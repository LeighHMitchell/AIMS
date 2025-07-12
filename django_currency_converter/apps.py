from django.apps import AppConfig


class CurrencyConverterConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'currency_converter'
    verbose_name = 'Currency Converter'

    def ready(self):
        """Initialize the currency converter when Django starts"""
        # Import here to avoid circular imports
        try:
            from .services.currency_converter import converter
            # Optionally initialize supported currencies on startup
            # converter.get_supported_currencies()
        except Exception as e:
            # Log but don't crash if initialization fails
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Currency converter initialization failed: {e}")