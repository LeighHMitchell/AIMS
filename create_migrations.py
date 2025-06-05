#!/usr/bin/env python
"""
Script to create Django migrations for model changes.
Run this after updating models to generate the necessary migration files.
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aims.settings')
django.setup()

# Create migrations
from django.core.management import execute_from_command_line

print("Creating migrations for model changes...")
execute_from_command_line(['manage.py', 'makemigrations', 'projects'])
print("Migrations created successfully!")
print("\nTo apply migrations, run: python manage.py migrate")