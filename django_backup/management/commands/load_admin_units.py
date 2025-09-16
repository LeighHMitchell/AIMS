from django.core.management.base import BaseCommand
from projects.models import AdminUnit, Country

class Command(BaseCommand):
    help = 'Load sample administrative units for Myanmar'

    def handle(self, *args, **options):
        # Get Myanmar country
        try:
            myanmar = Country.objects.get(name__icontains='Myanmar')
        except Country.DoesNotExist:
            self.stdout.write(self.style.ERROR('Myanmar country not found. Please create it first.'))
            return

        # Sample administrative units for Myanmar
        admin_units_data = [
            # States/Regions (admin_level: region)
            {'name': 'Yangon Region', 'admin_level': 'region', 'code': 'YGN', 'latitude': 16.8661, 'longitude': 96.1951, 'population': 7360703},
            {'name': 'Mandalay Region', 'admin_level': 'region', 'code': 'MDY', 'latitude': 21.9588, 'longitude': 96.0891, 'population': 6165723},
            {'name': 'Shan State', 'admin_level': 'region', 'code': 'SHN', 'latitude': 22.0, 'longitude': 98.0, 'population': 5824432},
            {'name': 'Ayeyarwady Region', 'admin_level': 'region', 'code': 'AYR', 'latitude': 17.0, 'longitude': 95.0, 'population': 6184829},
            {'name': 'Sagaing Region', 'admin_level': 'region', 'code': 'SAG', 'latitude': 22.0, 'longitude': 95.0, 'population': 5325347},
            {'name': 'Bago Region', 'admin_level': 'region', 'code': 'BGO', 'latitude': 17.5, 'longitude': 96.5, 'population': 4867373},
            {'name': 'Magway Region', 'admin_level': 'region', 'code': 'MGW', 'latitude': 20.0, 'longitude': 95.0, 'population': 3917055},
            {'name': 'Rakhine State', 'admin_level': 'region', 'code': 'RKH', 'latitude': 20.0, 'longitude': 93.0, 'population': 3188807},
            {'name': 'Kachin State', 'admin_level': 'region', 'code': 'KCH', 'latitude': 25.0, 'longitude': 97.0, 'population': 1689441},
            {'name': 'Kayin State', 'admin_level': 'region', 'code': 'KYN', 'latitude': 16.5, 'longitude': 98.0, 'population': 1574079},
            {'name': 'Kayah State', 'admin_level': 'region', 'code': 'KYH', 'latitude': 19.0, 'longitude': 97.5, 'population': 286738},
            {'name': 'Mon State', 'admin_level': 'region', 'code': 'MON', 'latitude': 15.5, 'longitude': 97.5, 'population': 2054393},
            {'name': 'Chin State', 'admin_level': 'region', 'code': 'CHN', 'latitude': 22.5, 'longitude': 93.5, 'population': 478801},
            {'name': 'Tanintharyi Region', 'admin_level': 'region', 'code': 'TNI', 'latitude': 12.0, 'longitude': 99.0, 'population': 1408401},
            {'name': 'Naypyitaw Union Territory', 'admin_level': 'region', 'code': 'NPT', 'latitude': 19.7633, 'longitude': 96.0785, 'population': 1160242},
        ]

        # Create regions/states
        created_regions = {}
        for unit_data in admin_units_data:
            admin_unit, created = AdminUnit.objects.get_or_create(
                name=unit_data['name'],
                country=myanmar,
                defaults={
                    'admin_level': unit_data['admin_level'],
                    'code': unit_data['code'],
                    'latitude': unit_data['latitude'],
                    'longitude': unit_data['longitude'],
                    'population': unit_data['population'],
                }
            )
            created_regions[unit_data['name']] = admin_unit
            if created:
                self.stdout.write(f'Created {unit_data["name"]}')
            else:
                self.stdout.write(f'{unit_data["name"]} already exists')

        # Sample districts for Yangon Region
        yangon_districts = [
            {'name': 'Yangon East District', 'code': 'YGN-E', 'latitude': 16.8661, 'longitude': 96.2951},
            {'name': 'Yangon West District', 'code': 'YGN-W', 'latitude': 16.8661, 'longitude': 96.0951},
            {'name': 'Yangon North District', 'code': 'YGN-N', 'latitude': 16.9661, 'longitude': 96.1951},
            {'name': 'Yangon South District', 'code': 'YGN-S', 'latitude': 16.7661, 'longitude': 96.1951},
        ]

        yangon_region = created_regions.get('Yangon Region')
        if yangon_region:
            for district_data in yangon_districts:
                district, created = AdminUnit.objects.get_or_create(
                    name=district_data['name'],
                    country=myanmar,
                    parent=yangon_region,
                    defaults={
                        'admin_level': 'district',
                        'code': district_data['code'],
                        'latitude': district_data['latitude'],
                        'longitude': district_data['longitude'],
                    }
                )
                if created:
                    self.stdout.write(f'Created district: {district_data["name"]}')

        # Sample districts for Mandalay Region
        mandalay_districts = [
            {'name': 'Mandalay District', 'code': 'MDY-C', 'latitude': 21.9588, 'longitude': 96.0891},
            {'name': 'Kyaukse District', 'code': 'MDY-K', 'latitude': 21.6058, 'longitude': 96.1372},
            {'name': 'Meiktila District', 'code': 'MDY-M', 'latitude': 20.8767, 'longitude': 95.8583},
            {'name': 'Nyaung-U District', 'code': 'MDY-N', 'latitude': 21.1719, 'longitude': 94.9297},
        ]

        mandalay_region = created_regions.get('Mandalay Region')
        if mandalay_region:
            for district_data in mandalay_districts:
                district, created = AdminUnit.objects.get_or_create(
                    name=district_data['name'],
                    country=myanmar,
                    parent=mandalay_region,
                    defaults={
                        'admin_level': 'district',
                        'code': district_data['code'],
                        'latitude': district_data['latitude'],
                        'longitude': district_data['longitude'],
                    }
                )
                if created:
                    self.stdout.write(f'Created district: {district_data["name"]}')

        self.stdout.write(self.style.SUCCESS('Successfully loaded administrative units for Myanmar')) 