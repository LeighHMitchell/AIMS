import logging
from datetime import datetime, date
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from ...models import SupportedCurrency

# You need to import your Transaction model here
# Replace 'your_app' with your actual app name
try:
    from django.apps import apps
    Transaction = apps.get_model('your_app', 'Transaction')  # Replace 'your_app' with actual app name
except LookupError:
    # Fallback - you'll need to import manually
    # from your_actual_app.models import Transaction
    Transaction = None
from ...services.currency_converter import converter, CurrencyConversionError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Convert transaction values to USD using historical exchange rates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of transactions to process in each batch (default: 100)'
        )
        parser.add_argument(
            '--currency',
            type=str,
            help='Only convert transactions with this specific currency code'
        )
        parser.add_argument(
            '--activity-id',
            type=str,
            help='Only convert transactions for this specific activity ID'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be converted without making changes'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Reconvert transactions that already have USD values'
        )
        parser.add_argument(
            '--refresh-currencies',
            action='store_true',
            help='Refresh the list of supported currencies from API before converting'
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Only convert transactions after this date (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='Only convert transactions before this date (YYYY-MM-DD)'
        )

    def handle(self, *args, **options):
        # Check if Transaction model is available
        if Transaction is None:
            self.stdout.write(
                self.style.ERROR(
                    "Transaction model not found. Please update the import in this command to reference your actual Transaction model."
                )
            )
            return
        
        self.verbosity = options['verbosity']
        self.dry_run = options['dry_run']
        self.force = options['force']
        
        # Setup logging
        if self.verbosity >= 2:
            logging.basicConfig(level=logging.DEBUG)
        elif self.verbosity >= 1:
            logging.basicConfig(level=logging.INFO)
        else:
            logging.basicConfig(level=logging.WARNING)

        # Refresh supported currencies if requested
        if options['refresh_currencies']:
            self.stdout.write("Refreshing supported currencies from API...")
            try:
                supported = converter.get_supported_currencies(refresh=True)
                self.stdout.write(
                    self.style.SUCCESS(f"Updated {len(supported)} supported currencies")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Failed to refresh currencies: {e}")
                )
                return

        # Build query filters
        filters = self._build_filters(options)
        
        # Get transactions to convert
        transactions_qs = Transaction.objects.filter(**filters)
        
        if not self.force:
            transactions_qs = transactions_qs.filter(value_usd__isnull=True)
        
        total_count = transactions_qs.count()
        
        if total_count == 0:
            self.stdout.write("No transactions found to convert.")
            return

        self.stdout.write(f"Found {total_count} transactions to convert")
        
        if self.dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes will be made"))
            self._preview_conversions(transactions_qs[:20])  # Preview first 20
            return

        # Process in batches
        batch_size = options['batch_size']
        processed = 0
        converted = 0
        skipped = 0
        errors = 0

        try:
            for batch_start in range(0, total_count, batch_size):
                batch_transactions = transactions_qs[batch_start:batch_start + batch_size]
                
                batch_converted, batch_skipped, batch_errors = self._process_batch(
                    batch_transactions
                )
                
                converted += batch_converted
                skipped += batch_skipped
                errors += batch_errors
                processed += len(batch_transactions)
                
                if self.verbosity >= 1:
                    progress = (processed / total_count) * 100
                    self.stdout.write(
                        f"Progress: {processed}/{total_count} ({progress:.1f}%) - "
                        f"Converted: {converted}, Skipped: {skipped}, Errors: {errors}"
                    )

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nConversion interrupted by user"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Unexpected error: {e}"))
            raise

        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("CONVERSION SUMMARY:")
        self.stdout.write(f"Total processed: {processed}")
        self.stdout.write(self.style.SUCCESS(f"Successfully converted: {converted}"))
        self.stdout.write(self.style.WARNING(f"Skipped (unsupported): {skipped}"))
        self.stdout.write(self.style.ERROR(f"Errors: {errors}"))

    def _build_filters(self, options):
        """Build Django ORM filters based on command options"""
        filters = {}
        
        # Currency filter
        if options['currency']:
            filters['currency'] = options['currency'].upper()
        
        # Activity filter
        if options['activity_id']:
            filters['activity_id'] = options['activity_id']
        
        # Date range filters
        if options['start_date']:
            try:
                start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
                filters['transaction_date__gte'] = start_date
            except ValueError:
                raise CommandError("Invalid start date format. Use YYYY-MM-DD")
        
        if options['end_date']:
            try:
                end_date = datetime.strptime(options['end_date'], '%Y-%m-%d').date()
                filters['transaction_date__lte'] = end_date
            except ValueError:
                raise CommandError("Invalid end date format. Use YYYY-MM-DD")
        
        # Only transactions with values
        filters['value__gt'] = 0
        
        return filters

    def _preview_conversions(self, transactions):
        """Preview what would be converted in dry-run mode"""
        self.stdout.write("\nPREVIEW (first 20 transactions):")
        self.stdout.write("-" * 80)
        
        for txn in transactions:
            if txn.currency == 'USD':
                status = "SKIP (already USD)"
            elif not converter.is_currency_supported(txn.currency):
                status = "SKIP (unsupported currency)"
            elif txn.value_usd and not self.force:
                status = "SKIP (already converted)"
            else:
                status = "CONVERT"
            
            self.stdout.write(
                f"ID: {txn.id:<8} | {txn.value:>10} {txn.currency:<3} | "
                f"{txn.transaction_date} | {status}"
            )

    def _process_batch(self, transactions):
        """Process a batch of transactions"""
        converted = 0
        skipped = 0
        errors = 0
        
        for txn in transactions:
            try:
                result = self._convert_transaction(txn)
                if result == 'converted':
                    converted += 1
                elif result == 'skipped':
                    skipped += 1
                    
            except Exception as e:
                errors += 1
                logger.error(f"Error converting transaction {txn.id}: {e}")
                
                if self.verbosity >= 1:
                    self.stdout.write(
                        self.style.ERROR(f"Error converting transaction {txn.id}: {e}")
                    )
        
        return converted, skipped, errors

    def _convert_transaction(self, txn):
        """Convert a single transaction to USD"""
        
        # Skip if already USD
        if txn.currency == 'USD':
            if self.verbosity >= 2:
                self.stdout.write(f"Skipping USD transaction {txn.id}")
            return 'skipped'
        
        # Skip if already converted and not forcing
        if txn.value_usd and not self.force:
            if self.verbosity >= 2:
                self.stdout.write(f"Skipping already converted transaction {txn.id}")
            return 'skipped'
        
        # Skip if currency not supported
        if not converter.is_currency_supported(txn.currency):
            if self.verbosity >= 2:
                self.stdout.write(f"Currency {txn.currency} not supported for transaction {txn.id}")
            txn.mark_unconvertible()
            return 'skipped'
        
        # Get the transaction date (prefer value_date if available for IATI compliance)
        conversion_date = getattr(txn, 'value_date', None) or txn.transaction_date
        if isinstance(conversion_date, datetime):
            conversion_date = conversion_date.date()
        
        # Perform conversion
        try:
            usd_amount, exchange_rate = converter.convert_to_usd(
                txn.value, 
                txn.currency, 
                conversion_date
            )
            
            if usd_amount is None:
                # Conversion failed
                txn.mark_unconvertible()
                if self.verbosity >= 2:
                    self.stdout.write(f"Failed to convert transaction {txn.id}")
                return 'skipped'
            
            # Save USD value
            txn.set_usd_value(usd_amount, exchange_rate)
            
            if self.verbosity >= 2:
                self.stdout.write(
                    f"Converted transaction {txn.id}: {txn.value} {txn.currency} -> "
                    f"{usd_amount} USD (rate: {exchange_rate})"
                )
            
            return 'converted'
            
        except Exception as e:
            logger.error(f"Conversion error for transaction {txn.id}: {e}")
            raise