import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, Mock
from django.test import TestCase
from django.utils import timezone

from ..models import SupportedCurrency, ExchangeRateCache
# Import your actual Transaction model for testing
# from your_app.models import Transaction
from ..services.currency_converter import CurrencyConverter, CurrencyConversionError


class CurrencyConverterTest(TestCase):
    
    def setUp(self):
        self.converter = CurrencyConverter()
        
        # Create test supported currencies
        SupportedCurrency.objects.create(code='EUR', name='Euro', is_supported=True)
        SupportedCurrency.objects.create(code='GBP', name='British Pound', is_supported=True)
        SupportedCurrency.objects.create(code='MMK', name='Myanmar Kyat', is_supported=False)
        
        # Create test exchange rate cache
        ExchangeRateCache.objects.create(
            currency='EUR',
            date=date.today(),
            rate_to_usd=Decimal('1.10')
        )

    def test_is_currency_supported(self):
        """Test currency support checking"""
        self.assertTrue(self.converter.is_currency_supported('USD'))
        self.assertTrue(self.converter.is_currency_supported('EUR'))
        self.assertTrue(self.converter.is_currency_supported('GBP'))
        self.assertFalse(self.converter.is_currency_supported('MMK'))
        self.assertFalse(self.converter.is_currency_supported('INVALID'))

    def test_convert_usd_to_usd(self):
        """Test USD to USD conversion (should return same amount)"""
        amount, rate = self.converter.convert_to_usd(
            Decimal('100.00'), 'USD', date.today()
        )
        self.assertEqual(amount, Decimal('100.00'))
        self.assertEqual(rate, Decimal('1.0'))

    def test_convert_with_cached_rate(self):
        """Test conversion using cached exchange rate"""
        amount, rate = self.converter.convert_to_usd(
            Decimal('100.00'), 'EUR', date.today()
        )
        self.assertEqual(amount, Decimal('110.00'))  # 100 * 1.10
        self.assertEqual(rate, Decimal('1.10'))

    def test_convert_unsupported_currency(self):
        """Test conversion with unsupported currency"""
        amount, rate = self.converter.convert_to_usd(
            Decimal('100.00'), 'MMK', date.today()
        )
        self.assertIsNone(amount)
        self.assertIsNone(rate)

    def test_convert_invalid_amount(self):
        """Test conversion with invalid amounts"""
        # Zero amount
        amount, rate = self.converter.convert_to_usd(
            Decimal('0.00'), 'EUR', date.today()
        )
        self.assertIsNone(amount)
        self.assertIsNone(rate)
        
        # Negative amount
        amount, rate = self.converter.convert_to_usd(
            Decimal('-100.00'), 'EUR', date.today()
        )
        self.assertIsNone(amount)
        self.assertIsNone(rate)

    @patch('requests.Session.get')
    def test_fetch_rate_from_api_success(self, mock_get):
        """Test successful API rate fetching"""
        # Mock API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'success': True,
            'rates': {'USD': 1.25}
        }
        mock_get.return_value = mock_response
        
        rate = self.converter._fetch_rate_from_api('GBP', 'USD', date.today())
        self.assertEqual(rate, Decimal('1.25'))
        
        # Verify rate was cached
        cached_rate = ExchangeRateCache.objects.get(
            currency='GBP',
            date=date.today()
        )
        self.assertEqual(cached_rate.rate_to_usd, Decimal('1.25'))

    @patch('requests.Session.get')
    def test_fetch_rate_from_api_failure(self, mock_get):
        """Test API rate fetching failure"""
        # Mock API error response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'success': False,
            'error': {'info': 'Currency not found'}
        }
        mock_get.return_value = mock_response
        
        rate = self.converter._fetch_rate_from_api('INVALID', 'USD', date.today())
        self.assertIsNone(rate)

    @patch('requests.Session.get')
    def test_api_retry_mechanism(self, mock_get):
        """Test API retry mechanism on network errors"""
        # First two calls fail, third succeeds
        mock_get.side_effect = [
            Exception("Network error"),
            Exception("Network error"),
            Mock(ok=True, json=lambda: {'success': True, 'rates': {'USD': 1.30}})
        ]
        
        with patch('time.sleep'):  # Speed up test by mocking sleep
            rate = self.converter._fetch_rate_from_api('GBP', 'USD', date.today())
        
        self.assertEqual(rate, Decimal('1.30'))
        self.assertEqual(mock_get.call_count, 3)

    def test_future_date_handling(self):
        """Test that future dates are handled correctly"""
        future_date = date.today() + timedelta(days=30)
        rate = self.converter._fetch_rate_from_api('EUR', 'USD', future_date)
        self.assertIsNone(rate)

    @patch('django.core.cache.cache.get')
    @patch('django.core.cache.cache.set')
    def test_memory_cache_usage(self, mock_cache_set, mock_cache_get):
        """Test memory cache is used correctly"""
        # Mock cache hit
        mock_cache_get.return_value = 1.15
        
        rate = self.converter.get_exchange_rate('EUR', 'USD', date.today())
        self.assertEqual(rate, Decimal('1.15'))
        
        # Should not hit database when cache is available
        mock_cache_get.assert_called_once()


class TransactionModelTest(TestCase):
    
    def setUp(self):
        self.transaction = Transaction.objects.create(
            activity_id='test-activity',
            transaction_type='commitment',
            value=Decimal('1000.00'),
            currency='EUR',
            transaction_date=date.today()
        )

    def test_needs_usd_conversion(self):
        """Test needs_usd_conversion logic"""
        # Should need conversion
        self.assertTrue(self.transaction.needs_usd_conversion())
        
        # Should not need conversion after setting USD value
        self.transaction.value_usd = Decimal('1100.00')
        self.transaction.save()
        self.assertFalse(self.transaction.needs_usd_conversion())
        
        # USD transactions should not need conversion
        usd_transaction = Transaction.objects.create(
            activity_id='test-activity-2',
            transaction_type='commitment',
            value=Decimal('1000.00'),
            currency='USD',
            transaction_date=date.today()
        )
        self.assertFalse(usd_transaction.needs_usd_conversion())

    def test_mark_unconvertible(self):
        """Test marking transaction as unconvertible"""
        self.transaction.mark_unconvertible()
        self.transaction.refresh_from_db()
        
        self.assertFalse(self.transaction.usd_convertible)
        self.assertIsNotNone(self.transaction.usd_conversion_date)

    def test_set_usd_value(self):
        """Test setting USD value and metadata"""
        self.transaction.set_usd_value(
            Decimal('1100.00'), 
            Decimal('1.10')
        )
        self.transaction.refresh_from_db()
        
        self.assertEqual(self.transaction.value_usd, Decimal('1100.00'))
        self.assertEqual(self.transaction.exchange_rate_used, Decimal('1.10'))
        self.assertTrue(self.transaction.usd_convertible)
        self.assertIsNotNone(self.transaction.usd_conversion_date)


class SupportedCurrencyModelTest(TestCase):
    
    def setUp(self):
        SupportedCurrency.objects.create(code='EUR', name='Euro', is_supported=True)
        SupportedCurrency.objects.create(code='GBP', name='British Pound', is_supported=True)
        SupportedCurrency.objects.create(code='MMK', name='Myanmar Kyat', is_supported=False)

    def test_get_supported_codes(self):
        """Test getting list of supported currency codes"""
        supported = SupportedCurrency.get_supported_codes()
        self.assertIn('EUR', supported)
        self.assertIn('GBP', supported)
        self.assertNotIn('MMK', supported)

    def test_is_currency_supported(self):
        """Test currency support checking"""
        self.assertTrue(SupportedCurrency.is_currency_supported('EUR'))
        self.assertTrue(SupportedCurrency.is_currency_supported('gbp'))  # Case insensitive
        self.assertFalse(SupportedCurrency.is_currency_supported('MMK'))
        self.assertFalse(SupportedCurrency.is_currency_supported('INVALID'))


class ExchangeRateCacheTest(TestCase):
    
    def test_cache_uniqueness(self):
        """Test that currency+date combination is unique"""
        # Create first rate
        ExchangeRateCache.objects.create(
            currency='EUR',
            date=date.today(),
            rate_to_usd=Decimal('1.10')
        )
        
        # Attempting to create duplicate should raise error
        with self.assertRaises(Exception):
            ExchangeRateCache.objects.create(
                currency='EUR',
                date=date.today(),
                rate_to_usd=Decimal('1.15')
            )

    def test_cache_string_representation(self):
        """Test string representation of cache entries"""
        rate = ExchangeRateCache.objects.create(
            currency='EUR',
            date=date.today(),
            rate_to_usd=Decimal('1.10')
        )
        
        expected = f"EUR -> USD on {date.today()}: 1.10"
        self.assertEqual(str(rate), expected)


@pytest.mark.django_db
class TestIntegration:
    """Integration tests for the full conversion workflow"""
    
    def test_full_conversion_workflow(self):
        """Test complete workflow from transaction creation to USD conversion"""
        # Setup
        SupportedCurrency.objects.create(code='EUR', name='Euro', is_supported=True)
        
        # Create transaction
        transaction = Transaction.objects.create(
            activity_id='test-activity',
            transaction_type='commitment', 
            value=Decimal('1000.00'),
            currency='EUR',
            transaction_date=date.today()
        )
        
        # Mock API response
        with patch('requests.Session.get') as mock_get:
            mock_response = Mock()
            mock_response.ok = True
            mock_response.json.return_value = {
                'success': True,
                'rates': {'USD': 1.10}
            }
            mock_get.return_value = mock_response
            
            # Convert to USD
            converter = CurrencyConverter()
            usd_amount, rate = converter.convert_to_usd(
                transaction.value,
                transaction.currency,
                transaction.transaction_date
            )
            
            # Update transaction
            transaction.set_usd_value(usd_amount, rate)
        
        # Verify results
        transaction.refresh_from_db()
        assert transaction.value_usd == Decimal('1100.00')
        assert transaction.exchange_rate_used == Decimal('1.10')
        assert transaction.usd_convertible == True
        assert transaction.usd_conversion_date is not None
        
        # Verify rate was cached
        cached_rate = ExchangeRateCache.objects.get(
            currency='EUR',
            date=transaction.transaction_date
        )
        assert cached_rate.rate_to_usd == Decimal('1.10')

    def test_unsupported_currency_workflow(self):
        """Test workflow with unsupported currency"""
        # Setup unsupported currency
        SupportedCurrency.objects.create(code='MMK', name='Myanmar Kyat', is_supported=False)
        
        # Create transaction
        transaction = Transaction.objects.create(
            activity_id='test-activity',
            transaction_type='commitment',
            value=Decimal('100000.00'),
            currency='MMK',
            transaction_date=date.today()
        )
        
        # Attempt conversion
        converter = CurrencyConverter()
        usd_amount, rate = converter.convert_to_usd(
            transaction.value,
            transaction.currency,
            transaction.transaction_date
        )
        
        # Should fail
        assert usd_amount is None
        assert rate is None
        
        # Mark as unconvertible
        transaction.mark_unconvertible()
        transaction.refresh_from_db()
        
        assert transaction.value_usd is None
        assert transaction.usd_convertible == False
        assert transaction.usd_conversion_date is not None