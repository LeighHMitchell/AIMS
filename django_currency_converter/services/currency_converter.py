import requests
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Optional, Dict, List, Tuple
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.db import transaction as db_transaction
from ..models import ExchangeRateCache, SupportedCurrency

logger = logging.getLogger(__name__)


class CurrencyConversionError(Exception):
    """Custom exception for currency conversion errors"""
    pass


class ExchangeRateAPIError(Exception):
    """Exception for API-related errors"""
    pass


class CurrencyConverter:
    """
    Historical currency converter using ExchangeRate.host API
    Supports caching and handles rate limits gracefully
    """
    
    # Alternative free APIs that don't require keys
    BASE_URL = "https://api.exchangerate-api.com/v4"  # Free tier available
    FALLBACK_URL = "https://api.fxratesapi.com"  # Another free option
    CACHE_PREFIX = "exchange_rate"
    CACHE_TIMEOUT = 86400  # 24 hours in seconds
    API_TIMEOUT = 10  # seconds
    MAX_RETRIES = 3
    
    # Common currencies supported by most free APIs
    DEFAULT_SUPPORTED_CURRENCIES = [
        'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
        'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW',
        'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'DKK', 'THB', 'MYR', 'PHP',
        'IDR', 'VND', 'EGP', 'MAD', 'NGN', 'KES', 'GHS', 'UGX', 'TZS', 'ZMW'
    ]

    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = self.API_TIMEOUT

    def get_supported_currencies(self, refresh=False) -> List[str]:
        """
        Get list of supported currencies from API or cache
        
        Args:
            refresh: If True, refresh from API. Otherwise use cached/DB values.
            
        Returns:
            List of supported currency codes
        """
        cache_key = f"{self.CACHE_PREFIX}_supported_currencies"
        
        if not refresh:
            # Try cache first
            cached_currencies = cache.get(cache_key)
            if cached_currencies:
                return cached_currencies
            
            # Try database
            db_currencies = SupportedCurrency.get_supported_codes()
            if db_currencies:
                cache.set(cache_key, db_currencies, self.CACHE_TIMEOUT)
                return db_currencies
        
        # Fetch from API
        try:
            # Use exchangerate-api.com which is free and doesn't require key
            response = self.session.get(f"{self.BASE_URL}/latest/USD")
            response.raise_for_status()
            
            data = response.json()
            if 'rates' not in data:
                raise ExchangeRateAPIError(f"API error: Invalid response format")
            
            api_currencies = list(data.get('rates', {}).keys())
            # Add USD as base currency
            api_currencies.append('USD')
            
            # Update database with supported currencies
            self._update_supported_currencies(api_currencies)
            
            # Cache the result
            cache.set(cache_key, api_currencies, self.CACHE_TIMEOUT)
            
            logger.info(f"Fetched {len(api_currencies)} supported currencies from API")
            return api_currencies
            
        except Exception as e:
            logger.warning(f"Failed to fetch supported currencies from API: {e}")
            # Fallback to default list
            self._update_supported_currencies(self.DEFAULT_SUPPORTED_CURRENCIES)
            cache.set(cache_key, self.DEFAULT_SUPPORTED_CURRENCIES, self.CACHE_TIMEOUT)
            return self.DEFAULT_SUPPORTED_CURRENCIES

    def _update_supported_currencies(self, currency_codes: List[str]):
        """Update the SupportedCurrency model with API results"""
        with db_transaction.atomic():
            # Mark all as unsupported first
            SupportedCurrency.objects.all().update(is_supported=False)
            
            # Update/create supported currencies
            for code in currency_codes:
                SupportedCurrency.objects.update_or_create(
                    code=code.upper(),
                    defaults={
                        'is_supported': True,
                        'name': self._get_currency_name(code)
                    }
                )

    def _get_currency_name(self, code: str) -> str:
        """Get human-readable currency name"""
        currency_names = {
            'USD': 'US Dollar', 'EUR': 'Euro', 'GBP': 'British Pound',
            'JPY': 'Japanese Yen', 'AUD': 'Australian Dollar', 'CAD': 'Canadian Dollar',
            'CHF': 'Swiss Franc', 'CNY': 'Chinese Yuan', 'SEK': 'Swedish Krona',
            'NZD': 'New Zealand Dollar', 'MXN': 'Mexican Peso', 'SGD': 'Singapore Dollar',
            'HKD': 'Hong Kong Dollar', 'NOK': 'Norwegian Krone', 'TRY': 'Turkish Lira',
            'RUB': 'Russian Ruble', 'INR': 'Indian Rupee', 'BRL': 'Brazilian Real',
            'ZAR': 'South African Rand', 'KRW': 'South Korean Won', 'MMK': 'Myanmar Kyat'
        }
        return currency_names.get(code.upper(), f"{code.upper()} Currency")

    def is_currency_supported(self, currency_code: str) -> bool:
        """Check if a currency is supported for conversion"""
        if currency_code.upper() == 'USD':
            return True
        
        supported_currencies = self.get_supported_currencies()
        return currency_code.upper() in supported_currencies

    def get_exchange_rate(self, from_currency: str, to_currency: str, date_value: date) -> Optional[Decimal]:
        """
        Get historical exchange rate for a specific date
        
        Args:
            from_currency: Source currency code
            to_currency: Target currency code (should be USD)
            date_value: Date for the exchange rate
            
        Returns:
            Exchange rate as Decimal, or None if not available
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        # Handle USD to USD
        if from_currency == to_currency:
            return Decimal('1.0')
        
        # Check if currency is supported
        if not self.is_currency_supported(from_currency):
            logger.warning(f"Currency {from_currency} is not supported")
            return None
        
        # Check cache first (DB cache)
        try:
            cached_rate = ExchangeRateCache.objects.get(
                currency=from_currency,
                date=date_value
            )
            logger.debug(f"Using cached rate for {from_currency} on {date_value}: {cached_rate.rate_to_usd}")
            return cached_rate.rate_to_usd
        except ExchangeRateCache.DoesNotExist:
            pass
        
        # Check memory cache
        cache_key = f"{self.CACHE_PREFIX}_{from_currency}_{to_currency}_{date_value}"
        cached_rate = cache.get(cache_key)
        if cached_rate:
            logger.debug(f"Using memory cached rate for {from_currency} on {date_value}: {cached_rate}")
            return Decimal(str(cached_rate))
        
        # Fetch from API
        return self._fetch_rate_from_api(from_currency, to_currency, date_value)

    def _fetch_rate_from_api(self, from_currency: str, to_currency: str, date_value: date) -> Optional[Decimal]:
        """Fetch exchange rate from ExchangeRate.host API"""
        
        # Don't fetch rates for future dates
        if date_value > date.today():
            logger.warning(f"Cannot fetch exchange rate for future date: {date_value}")
            return None
        
        # Format date for API
        date_str = date_value.strftime('%Y-%m-%d')
        
        for attempt in range(self.MAX_RETRIES):
            try:
                # Use exchangerate-api.com historical endpoint
                # For historical data, try different approach
                if from_currency == 'USD':
                    # Direct USD to other currency
                    url = f"{self.BASE_URL}/history/{date_str}"
                    response = self.session.get(url)
                else:
                    # Get current rate (free APIs often don't have historical data)
                    # For production, you'd need a paid API for historical rates
                    url = f"{self.BASE_URL}/latest/{from_currency}"
                    response = self.session.get(url)
                
                logger.debug(f"Fetching rate from API: {url}")
                
                response.raise_for_status()
                data = response.json()
                
                rates = data.get('rates', {})
                if to_currency not in rates:
                    logger.error(f"Rate for {to_currency} not found in API response")
                    return None
                
                rate = Decimal(str(rates[to_currency]))
                
                # Cache the result in memory
                cache_key = f"{self.CACHE_PREFIX}_{from_currency}_{to_currency}_{date_value}"
                cache.set(cache_key, float(rate), self.CACHE_TIMEOUT)
                
                # Cache in database
                ExchangeRateCache.objects.update_or_create(
                    currency=from_currency,
                    date=date_value,
                    defaults={'rate_to_usd': rate}
                )
                
                logger.info(f"Fetched rate {from_currency} -> {to_currency} on {date_value}: {rate}")
                return rate
                
            except requests.exceptions.RequestException as e:
                logger.warning(f"API request failed (attempt {attempt + 1}/{self.MAX_RETRIES}): {e}")
                if attempt < self.MAX_RETRIES - 1:
                    # Wait before retry (exponential backoff)
                    import time
                    time.sleep(2 ** attempt)
                continue
                
            except (ValueError, InvalidOperation, KeyError) as e:
                logger.error(f"Error parsing API response: {e}")
                return None
        
        logger.error(f"Failed to fetch exchange rate after {self.MAX_RETRIES} attempts")
        return None

    def convert_to_usd(self, amount: Decimal, currency: str, transaction_date: date) -> Tuple[Optional[Decimal], Optional[Decimal]]:
        """
        Convert amount to USD using historical exchange rate
        
        Args:
            amount: Amount to convert
            currency: Currency code of the amount
            transaction_date: Date for historical rate lookup
            
        Returns:
            Tuple of (usd_amount, exchange_rate_used) or (None, None) if conversion failed
        """
        if not amount or amount <= 0:
            return None, None
        
        currency = currency.upper()
        
        # Already USD
        if currency == 'USD':
            return amount, Decimal('1.0')
        
        # Get exchange rate
        exchange_rate = self.get_exchange_rate(currency, 'USD', transaction_date)
        if exchange_rate is None:
            return None, None
        
        try:
            usd_amount = amount * exchange_rate
            # Round to 2 decimal places for currency
            usd_amount = usd_amount.quantize(Decimal('0.01'))
            
            logger.debug(f"Converted {amount} {currency} to {usd_amount} USD using rate {exchange_rate}")
            return usd_amount, exchange_rate
            
        except (InvalidOperation, OverflowError) as e:
            logger.error(f"Error converting {amount} {currency} to USD: {e}")
            return None, None

# Global converter instance
converter = CurrencyConverter()