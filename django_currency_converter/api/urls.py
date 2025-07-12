from django.urls import path
from . import views

app_name = 'currency_api'

urlpatterns = [
    # Currency support and conversion
    path('currencies/supported/', views.supported_currencies, name='supported_currencies'),
    path('convert/', views.convert_transactions, name='convert_transactions'),
    path('stats/', views.conversion_stats, name='conversion_stats'),
    
    # Transaction listing with conversion info
    path('transactions/', views.TransactionListView.as_view(), name='transaction_list'),
    
    # Exchange rate history
    path('rates/history/', views.exchange_rate_history, name='exchange_rate_history'),
]