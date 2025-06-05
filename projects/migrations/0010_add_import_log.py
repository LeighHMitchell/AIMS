# Generated manually for adding ImportLog model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0009_add_financial_transactions'),
    ]

    operations = [
        migrations.CreateModel(
            name='ImportLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entity_type', models.CharField(choices=[('activities', 'Activities'), ('organizations', 'Organizations'), ('transactions', 'Transactions')], max_length=50)),
                ('file_name', models.CharField(max_length=255)),
                ('total_rows', models.PositiveIntegerField()),
                ('successful_rows', models.PositiveIntegerField()),
                ('failed_rows', models.PositiveIntegerField()),
                ('import_date', models.DateTimeField(auto_now_add=True)),
                ('field_mappings', models.JSONField(blank=True, null=True)),
                ('error_log', models.JSONField(blank=True, null=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-import_date'],
            },
        ),
    ]