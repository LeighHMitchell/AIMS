# Generated by Django 5.2.1 on 2025-05-28 16:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_alter_aidproject_activity_status_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='aidproject',
            name='prism_id',
            field=models.CharField(blank=True, max_length=20, null=True, unique=True),
        ),
    ]
