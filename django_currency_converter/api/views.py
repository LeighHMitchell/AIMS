from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q
from django.utils import timezone
from ..models import SupportedCurrency, ExchangeRateCache
# Import your actual Transaction model
# from your_app.models import Transaction
from ..services.currency_converter import converter
from .serializers import (
    SupportedCurrencySerializer, TransactionSerializer,
    CurrencyConversionRequestSerializer, CurrencyListResponseSerializer,
    ConversionStatsSerializer
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def supported_currencies(request):
    """
    Get list of supported currencies for conversion
    Optionally refresh from API with ?refresh=true
    """
    refresh = request.GET.get('refresh', 'false').lower() == 'true'
    
    try:
        if refresh:
            # Refresh from API and get updated list
            converter.get_supported_currencies(refresh=True)
        
        currencies = SupportedCurrency.objects.filter(is_supported=True).order_by('code')
        serializer = SupportedCurrencySerializer(currencies, many=True)
        
        # Get last update time
        last_updated = None
        if currencies.exists():
            last_updated = currencies.first().last_checked
        
        response_data = {
            'supported_currencies': serializer.data,
            'total_count': len(serializer.data),
            'last_updated': last_updated
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch supported currencies: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def convert_transactions(request):
    """
    Convert specified transactions to USD
    """
    serializer = CurrencyConversionRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    transaction_ids = serializer.validated_data['transaction_ids']
    force_reconvert = serializer.validated_data['force_reconvert']
    
    # Get transactions to convert
    transactions_qs = Transaction.objects.filter(id__in=transaction_ids)
    
    if not force_reconvert:
        transactions_qs = transactions_qs.filter(value_usd__isnull=True)
    
    transactions = transactions_qs.exclude(currency='USD')
    
    results = {
        'requested': len(transaction_ids),
        'found': transactions_qs.count(),
        'converted': 0,
        'skipped': 0,
        'errors': 0,
        'details': []
    }
    
    for txn in transactions:
        try:
            if not converter.is_currency_supported(txn.currency):
                txn.mark_unconvertible()
                results['skipped'] += 1
                results['details'].append({
                    'transaction_id': txn.id,
                    'status': 'skipped',
                    'reason': 'Currency not supported'
                })
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
                results['skipped'] += 1
                results['details'].append({
                    'transaction_id': txn.id,
                    'status': 'skipped',
                    'reason': 'Conversion failed - no exchange rate available'
                })
            else:
                txn.set_usd_value(usd_amount, exchange_rate)
                results['converted'] += 1
                results['details'].append({
                    'transaction_id': txn.id,
                    'status': 'converted',
                    'original_value': f"{txn.value} {txn.currency}",
                    'usd_value': f"${usd_amount}",
                    'exchange_rate': str(exchange_rate)
                })
                
        except Exception as e:
            results['errors'] += 1
            results['details'].append({
                'transaction_id': txn.id,
                'status': 'error',
                'reason': str(e)
            })
    
    return Response(results)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def conversion_stats(request):
    """
    Get statistics about currency conversion status
    """
    # Get activity filter if provided
    activity_id = request.GET.get('activity_id')
    
    base_qs = Transaction.objects.all()
    if activity_id:
        base_qs = base_qs.filter(activity_id=activity_id)
    
    # Overall stats
    total_transactions = base_qs.count()
    converted_transactions = base_qs.filter(value_usd__isnull=False).exclude(currency='USD').count()
    unconvertible_transactions = base_qs.filter(usd_convertible=False).count()
    usd_transactions = base_qs.filter(currency='USD').count()
    pending_transactions = base_qs.filter(
        value_usd__isnull=True,
        usd_convertible=True
    ).exclude(currency='USD').count()
    
    conversion_rate = 0
    if total_transactions > 0:
        convertible_total = total_transactions - usd_transactions - unconvertible_transactions
        if convertible_total > 0:
            conversion_rate = (converted_transactions / convertible_total) * 100
    
    # Currency breakdown
    currencies_breakdown = {}
    currency_stats = base_qs.values('currency').annotate(
        total=Count('id'),
        converted=Count('id', filter=Q(value_usd__isnull=False)),
        unconvertible=Count('id', filter=Q(usd_convertible=False)),
        pending=Count('id', filter=Q(value_usd__isnull=True, usd_convertible=True))
    ).order_by('currency')
    
    for stat in currency_stats:
        currency = stat['currency']
        currencies_breakdown[currency] = {
            'total': stat['total'],
            'converted': stat['converted'],
            'unconvertible': stat['unconvertible'],
            'pending': stat['pending'],
            'is_supported': converter.is_currency_supported(currency)
        }
    
    stats_data = {
        'total_transactions': total_transactions,
        'converted_transactions': converted_transactions,
        'unconvertible_transactions': unconvertible_transactions,
        'pending_transactions': pending_transactions,
        'usd_transactions': usd_transactions,
        'conversion_rate': round(conversion_rate, 2),
        'currencies_breakdown': currencies_breakdown
    }
    
    return Response(stats_data)


class TransactionListView(generics.ListAPIView):
    """
    List transactions with USD conversion information
    Supports filtering by conversion status and currency
    """
    serializer_class = TransactionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Transaction.objects.all()
        
        # Filter by activity
        activity_id = self.request.query_params.get('activity_id')
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)
        
        # Filter by currency
        currency = self.request.query_params.get('currency')
        if currency:
            queryset = queryset.filter(currency=currency.upper())
        
        # Filter by conversion status
        conversion_status = self.request.query_params.get('conversion_status')
        if conversion_status == 'converted':
            queryset = queryset.filter(value_usd__isnull=False).exclude(currency='USD')
        elif conversion_status == 'pending':
            queryset = queryset.filter(
                value_usd__isnull=True,
                usd_convertible=True
            ).exclude(currency='USD')
        elif conversion_status == 'unconvertible':
            queryset = queryset.filter(usd_convertible=False)
        elif conversion_status == 'native_usd':
            queryset = queryset.filter(currency='USD')
        
        return queryset.order_by('-transaction_date')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def exchange_rate_history(request):
    """
    Get cached exchange rate history for a currency
    """
    currency = request.GET.get('currency', '').upper()
    if not currency:
        return Response(
            {'error': 'Currency parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get date range (default to last 30 days)
    from datetime import datetime, timedelta
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=30)
    
    start_param = request.GET.get('start_date')
    end_param = request.GET.get('end_date')
    
    if start_param:
        try:
            start_date = datetime.strptime(start_param, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid start_date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if end_param:
        try:
            end_date = datetime.strptime(end_param, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid end_date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Get exchange rate history
    rates = ExchangeRateCache.objects.filter(
        currency=currency,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    rate_data = [
        {
            'date': rate.date.isoformat(),
            'rate': str(rate.rate_to_usd),
            'created_at': rate.created_at.isoformat()
        }
        for rate in rates
    ]
    
    return Response({
        'currency': currency,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'rates': rate_data,
        'count': len(rate_data)
    })