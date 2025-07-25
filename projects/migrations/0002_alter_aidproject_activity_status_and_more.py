# Generated by Django 5.2.1 on 2025-05-28 16:20

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='aidproject',
            name='activity_status',
            field=models.CharField(blank=True, choices=[('pipeline', 'Pipeline/Identification'), ('implementation', 'Implementation'), ('completion', 'Completion'), ('cancelled', 'Cancelled'), ('suspended', 'Suspended')], max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='donor',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='projects', to='projects.donor'),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='end_date_planned',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='funding_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='iati_identifier',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='recipient_country',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='projects', to='projects.country'),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='start_date_planned',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='aidproject',
            name='total_budget',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True),
        ),
    ]
