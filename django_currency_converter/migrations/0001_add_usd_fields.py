# Generated by Django

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Add dependency to your existing transactions app's last migration
        # ('your_app', 'XXXX_your_last_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='value_usd',
            field=models.DecimalField(
                max_digits=20,
                decimal_places=2,
                null=True,
                blank=True,
                help_text='Transaction value converted to USD using historical exchange rate'
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='usd_convertible',
            field=models.BooleanField(
                default=True,
                help_text='Indicates if the currency can be converted to USD'
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='usd_conversion_date',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Timestamp when USD conversion was performed'
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='exchange_rate_used',
            field=models.DecimalField(
                max_digits=20,
                decimal_places=6,
                null=True,
                blank=True,
                help_text='Exchange rate used for USD conversion'
            ),
        ),
    ]