# AIMS Historical Currency Converter

A comprehensive Django implementation for converting aid transaction values to USD using historical exchange rates from ExchangeRate.host API.

## Features

- ✅ **Historical Currency Conversion**: Convert transaction values to USD using accurate historical exchange rates
- ✅ **API Integration**: Uses ExchangeRate.host free API with fallback support
- ✅ **Intelligent Caching**: Two-tier caching (memory + database) to minimize API calls
- ✅ **Currency Whitelist**: Only allows conversion for supported currencies
- ✅ **Bulk Processing**: Django management command for batch conversion
- ✅ **Admin Interface**: Enhanced admin with bulk conversion actions
- ✅ **REST API**: Complete API for frontend integration
- ✅ **React Components**: Ready-to-use frontend components
- ✅ **IATI Compliance**: Supports IATI `value-date` convention
- ✅ **Comprehensive Testing**: Full test suite with mocking

## Installation

1. **Add to Django Settings**:
```python
INSTALLED_APPS = [
    # ... your existing apps
    'currency_converter',
]

# Optional: Configure caching backend for better performance
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

2. **Run Migrations**:
```bash
python manage.py migrate
```

3. **Update URLs**:
```python
# urls.py
from django.urls import path, include

urlpatterns = [
    # ... your existing URLs
    path('api/currency/', include('currency_converter.api.urls')),
]
```

## Usage

### 1. Initialize Supported Currencies

```bash
# Fetch supported currencies from API and populate database
python manage.py convert_currencies --refresh-currencies
```

### 2. Bulk Convert Historical Transactions

```bash
# Convert all transactions
python manage.py convert_currencies

# Convert specific currency
python manage.py convert_currencies --currency EUR

# Convert with date range
python manage.py convert_currencies --start-date 2023-01-01 --end-date 2023-12-31

# Dry run to preview changes
python manage.py convert_currencies --dry-run

# Force reconversion of already converted transactions
python manage.py convert_currencies --force
```

### 3. Programmatic Usage

```python
from currency_converter.services.currency_converter import converter
from currency_converter.models import Transaction
from decimal import Decimal
from datetime import date

# Check currency support
if converter.is_currency_supported('EUR'):
    print("EUR is supported for conversion")

# Convert amount to USD
usd_amount, exchange_rate = converter.convert_to_usd(
    amount=Decimal('1000.00'),
    currency='EUR', 
    transaction_date=date(2023, 6, 15)
)

if usd_amount:
    print(f"1000 EUR = {usd_amount} USD (rate: {exchange_rate})")

# Update transaction with USD value
transaction = Transaction.objects.get(id=123)
if transaction.needs_usd_conversion():
    usd_amount, rate = converter.convert_to_usd(
        transaction.value,
        transaction.currency,
        transaction.transaction_date
    )
    if usd_amount:
        transaction.set_usd_value(usd_amount, rate)
    else:
        transaction.mark_unconvertible()
```

### 4. Frontend Integration

```jsx
import CurrencySelector from './frontend/CurrencySelector';
import TransactionDisplay from './frontend/TransactionDisplay';

// Currency selector with support validation
<CurrencySelector
  value={currency}
  onChange={setCurrency}
  placeholder="Select currency"
  showUSDInfo={true}
/>

// Transaction display with USD conversion info
<TransactionDisplay
  transaction={transaction}
  onConvert={handleConvert}
  showConvertButton={true}
/>
```

## API Endpoints

### Get Supported Currencies
```http
GET /api/currency/currencies/supported/
GET /api/currency/currencies/supported/?refresh=true
```

### Convert Transactions
```http
POST /api/currency/convert/
Content-Type: application/json

{
  "transaction_ids": [1, 2, 3],
  "force_reconvert": false
}
```

### Get Conversion Statistics
```http
GET /api/currency/stats/
GET /api/currency/stats/?activity_id=123
```

### List Transactions with USD Info
```http
GET /api/currency/transactions/
GET /api/currency/transactions/?currency=EUR
GET /api/currency/transactions/?conversion_status=pending
```

### Exchange Rate History
```http
GET /api/currency/rates/history/?currency=EUR
GET /api/currency/rates/history/?currency=EUR&start_date=2023-01-01&end_date=2023-12-31
```

## Models

### Transaction (Enhanced)
```python
class Transaction(models.Model):
    # Your existing fields...
    
    # New USD conversion fields
    value_usd = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    usd_convertible = models.BooleanField(default=True)
    usd_conversion_date = models.DateTimeField(null=True, blank=True)
    exchange_rate_used = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    
    def needs_usd_conversion(self):
        """Check if transaction needs USD conversion"""
        return (
            self.value_usd is None and 
            self.currency != 'USD' and
            self.value is not None and
            self.value > 0
        )
```

### SupportedCurrency
```python
class SupportedCurrency(models.Model):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=100)
    is_supported = models.BooleanField(default=True)
    last_checked = models.DateTimeField(auto_now=True)
```

### ExchangeRateCache
```python
class ExchangeRateCache(models.Model):
    currency = models.CharField(max_length=3)
    date = models.DateField()
    rate_to_usd = models.DecimalField(max_digits=20, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('currency', 'date')
```

## Configuration

### Environment Variables
```bash
# Optional: Configure exchange rate API timeout
EXCHANGE_RATE_API_TIMEOUT=10

# Optional: Configure cache timeout (seconds)
EXCHANGE_RATE_CACHE_TIMEOUT=86400
```

### Django Settings
```python
# Optional: Customize supported currencies
CURRENCY_CONVERTER_DEFAULT_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'
]

# Optional: Configure API retry settings
CURRENCY_CONVERTER_MAX_RETRIES = 3
CURRENCY_CONVERTER_RETRY_DELAY = 2  # seconds
```

## Admin Interface

The enhanced admin interface provides:

- **Transaction Admin**: View USD conversion status and bulk convert actions
- **Supported Currency Admin**: Manage and refresh currency support
- **Exchange Rate Cache Admin**: View cached exchange rates
- **Bulk Convert View**: Custom admin page for filtered bulk conversion

## Error Handling

The system gracefully handles:

- **API Rate Limits**: Automatic retry with exponential backoff
- **Network Errors**: Fallback to cached data when available
- **Unsupported Currencies**: Marked as unconvertible, no crashes
- **Invalid Dates**: Future dates and malformed dates are rejected
- **Missing Rates**: Transactions marked as unconvertible when rates unavailable

## Performance Considerations

- **Two-Tier Caching**: Memory cache for recent rates, database cache for historical data
- **Batch Processing**: Management command processes in configurable batch sizes
- **API Optimization**: Only one API call per currency+date combination
- **Database Indexing**: Optimized indexes on currency and date fields

## Testing

```bash
# Run all currency converter tests
python manage.py test currency_converter

# Run specific test classes
python manage.py test currency_converter.tests.test_currency_converter.CurrencyConverterTest

# Run with coverage
coverage run --source='.' manage.py test currency_converter
coverage report
```

## Troubleshooting

### Common Issues

1. **API Rate Limits**
   - The free ExchangeRate.host API has rate limits
   - System automatically retries with exponential backoff
   - Consider upgrading to paid plan for higher limits

2. **Missing Exchange Rates**
   - Some currencies may not have historical data available
   - Transactions are marked as unconvertible rather than failing
   - Check API documentation for supported currency pairs

3. **Performance Issues**
   - Enable Redis caching for better performance
   - Use batch processing for large datasets
   - Consider running conversions during off-peak hours

### Debugging

Enable debug logging:
```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': 'currency_converter.log',
        },
    },
    'loggers': {
        'currency_converter': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

## License

This implementation is designed for the AIMS project and follows Django best practices for production deployment.