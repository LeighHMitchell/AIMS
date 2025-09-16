"""
IATI Registry API Service
Handles interactions with the IATI Registry API to fetch organization data
"""

import requests
import xml.etree.ElementTree as ET
from typing import Dict, Optional, List
import logging
from django.conf import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IATIRegistryService:
    """Service class for interacting with IATI Registry API"""
    
    IATI_REGISTRY_BASE_URL = "https://iatiregistry.org/api/3"
    IATI_DATASTORE_BASE_URL = "https://api.iatistandard.org"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AIMS-IATI-Client/1.0'
        })
    
    def search_organization_datasets(self, org_identifier: str) -> List[Dict]:
        """
        Search for organization datasets in IATI Registry
        """
        try:
            logger.info(f"Searching for organization datasets with identifier: {org_identifier}")
            
            # Try multiple search strategies
            search_queries = [
                org_identifier,  # Exact match
                f"*{org_identifier}*",  # Wildcard search
                f"organisation_identifier:{org_identifier}",  # Field-specific search
            ]
            
            all_datasets = []
            
            for query in search_queries:
                url = f"{self.IATI_REGISTRY_BASE_URL}/action/package_search"
                params = {
                    'q': query,
                    'fq': 'dataset_type:organisation',
                    'rows': 50
                }
                
                logger.info(f"Searching with query: {query}")
                response = self.session.get(url, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                if data.get('success'):
                    datasets = data.get('result', {}).get('results', [])
                    logger.info(f"Found {len(datasets)} datasets for query: {query}")
                    all_datasets.extend(datasets)
                    
                    # If we found datasets, break early
                    if datasets:
                        break
                else:
                    logger.warning(f"Search failed for query: {query}")
            
            # Remove duplicates based on id
            unique_datasets = []
            seen_ids = set()
            for dataset in all_datasets:
                if dataset.get('id') not in seen_ids:
                    unique_datasets.append(dataset)
                    seen_ids.add(dataset.get('id'))
            
            logger.info(f"Total unique datasets found: {len(unique_datasets)}")
            return unique_datasets
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching organization datasets: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error searching organization datasets: {str(e)}")
            return []
    
    def get_organization_data_from_datastore(self, org_identifier: str) -> Optional[Dict]:
        """
        Get organization data from IATI Datastore API
        """
        try:
            logger.info(f"Fetching organization data from datastore for: {org_identifier}")
            
            # Try different datastore endpoints
            endpoints = [
                f"{self.IATI_DATASTORE_BASE_URL}/organisations/{org_identifier}",
                f"{self.IATI_DATASTORE_BASE_URL}/organisations?organisation_identifier={org_identifier}",
            ]
            
            for endpoint in endpoints:
                logger.info(f"Trying datastore endpoint: {endpoint}")
                response = self.session.get(endpoint, timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Successfully fetched data from datastore")
                    return data
                else:
                    logger.info(f"Datastore endpoint returned status: {response.status_code}")
            
            logger.info("No data found in datastore")
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching from datastore: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching from datastore: {str(e)}")
            return None
    
    def fetch_organization_xml(self, dataset_url: str) -> Optional[str]:
        """
        Fetch organization XML data from a dataset URL
        """
        try:
            logger.info(f"Fetching XML from: {dataset_url}")
            response = self.session.get(dataset_url, timeout=30)
            response.raise_for_status()
            logger.info("Successfully fetched XML data")
            return response.text
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching organization XML: {str(e)}")
            return None
    
    def parse_organization_xml(self, xml_content: str) -> List[Dict]:
        """
        Parse IATI organization XML and extract organization data
        """
        organizations = []
        
        try:
            logger.info("Parsing organization XML")
            root = ET.fromstring(xml_content)
            
            # Handle different XML namespaces
            namespaces = {
                'iati': 'http://iatistandard.org/202',
                'iati201': 'http://iatistandard.org/201',
                'iati203': 'http://iatistandard.org/203'
            }
            
            # Try to find organization elements with different namespaces
            org_elements = []
            for ns_prefix, ns_uri in namespaces.items():
                elements = root.findall(f'.//{{{ns_uri}}}iati-organisation')
                if elements:
                    org_elements.extend(elements)
                    logger.info(f"Found {len(elements)} organization elements with namespace {ns_prefix}")
            
            # If no namespaced elements found, try without namespace
            if not org_elements:
                org_elements = root.findall('.//iati-organisation')
                logger.info(f"Found {len(org_elements)} organization elements without namespace")
            
            for org_element in org_elements:
                org_data = self._extract_organization_data(org_element)
                if org_data:
                    organizations.append(org_data)
                    logger.info(f"Extracted data for organization: {org_data.get('name', 'Unknown')}")
                    
        except ET.ParseError as e:
            logger.error(f"Error parsing organization XML: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error parsing organization XML: {str(e)}")
        
        logger.info(f"Total organizations extracted: {len(organizations)}")
        return organizations
    
    def _extract_organization_data(self, org_element) -> Optional[Dict]:
        """
        Extract organization data from an XML element
        """
        try:
            # Get organization identifier
            org_identifier = org_element.get('organisation-identifier', '')
            
            # Get organization name
            name_element = org_element.find('.//name')
            org_name = ''
            if name_element is not None:
                narrative = name_element.find('.//narrative')
                if narrative is not None:
                    org_name = narrative.text or ''
                else:
                    org_name = name_element.text or ''
            
            # Get organization type
            org_type_element = org_element.find('.//organisation-type')
            org_type = ''
            if org_type_element is not None:
                org_type = org_type_element.get('code', '')
            
            # Get website
            website = ''
            website_element = org_element.find('.//website')
            if website_element is not None:
                website = website_element.text or ''
            
            # Get contact information
            contact_info = self._extract_contact_info(org_element)
            
            # Get address information
            address_info = self._extract_address_info(org_element)
            
            return {
                'iati_identifier': org_identifier,
                'name': org_name.strip(),
                'organization_type': self._map_iati_org_type(org_type),
                'website': website.strip(),
                'contact_email': contact_info.get('email', ''),
                'contact_phone': contact_info.get('phone', ''),
                'address': address_info.get('address', ''),
                'country': address_info.get('country', ''),
                'description': self._extract_description(org_element)
            }
            
        except Exception as e:
            logger.error(f"Error extracting organization data: {str(e)}")
            return None
    
    def _extract_contact_info(self, org_element) -> Dict[str, str]:
        """Extract contact information from organization element"""
        contact_info = {'email': '', 'phone': ''}
        
        try:
            # Look for contact-info elements
            contact_elements = org_element.findall('.//contact-info')
            for contact in contact_elements:
                # Email
                email_element = contact.find('.//email')
                if email_element is not None and not contact_info['email']:
                    contact_info['email'] = email_element.text or ''
                
                # Phone
                phone_element = contact.find('.//telephone')
                if phone_element is not None and not contact_info['phone']:
                    contact_info['phone'] = phone_element.text or ''
        except Exception as e:
            logger.error(f"Error extracting contact info: {str(e)}")
        
        return contact_info
    
    def _extract_address_info(self, org_element) -> Dict[str, str]:
        """Extract address information from organization element"""
        address_info = {'address': '', 'country': ''}
        
        try:
            # Look for address elements
            address_elements = org_element.findall('.//address')
            for address in address_elements:
                # Full address
                address_lines = []
                for line in address.findall('.//address-line'):
                    if line.text:
                        address_lines.append(line.text.strip())
                
                if address_lines and not address_info['address']:
                    address_info['address'] = '\n'.join(address_lines)
                
                # Country
                country_element = address.find('.//country')
                if country_element is not None and not address_info['country']:
                    country_code = country_element.get('code', '')
                    country_name = country_element.text or ''
                    address_info['country'] = country_name or country_code
        except Exception as e:
            logger.error(f"Error extracting address info: {str(e)}")
        
        return address_info
    
    def _extract_description(self, org_element) -> str:
        """Extract organization description"""
        try:
            # Look for description or narrative elements
            desc_element = org_element.find('.//description')
            if desc_element is not None:
                narrative = desc_element.find('.//narrative')
                if narrative is not None:
                    return narrative.text or ''
                return desc_element.text or ''
        except Exception as e:
            logger.error(f"Error extracting description: {str(e)}")
        
        return ''
    
    def _map_iati_org_type(self, iati_type_code: str) -> str:
        """Map IATI organization type codes to our system's organization types"""
        mapping = {
            '10': 'government',      # Government
            '11': 'government',      # Local Government
            '15': 'government',      # Other Public Sector
            '21': 'ingo',           # International NGO
            '22': 'ngo',            # National NGO
            '23': 'ngo',            # Regional NGO
            '30': 'multilateral',   # Public Private Partnership
            '40': 'multilateral',   # Multilateral
            '60': 'private',        # Foundation
            '70': 'private',        # Private Sector
            '80': 'academic',       # Academic, Training and Research
            '90': 'other',          # Other
        }
        
        return mapping.get(iati_type_code, 'other')
    
    def get_organization_info(self, org_identifier: str) -> Optional[Dict]:
        """
        Main method to get organization information from IATI
        """
        logger.info(f"Fetching organization info for: {org_identifier}")
        
        # Clean and normalize the identifier
        org_identifier = org_identifier.strip()
        
        # First, try to get data from datastore
        logger.info("Attempting to fetch from IATI Datastore...")
        org_data = self.get_organization_data_from_datastore(org_identifier)
        if org_data:
            logger.info("Successfully found data in IATI Datastore")
            return self._process_datastore_org_data(org_data)
        
        # If datastore doesn't have the data, search registry for datasets
        logger.info("Datastore search unsuccessful, trying IATI Registry...")
        datasets = self.search_organization_datasets(org_identifier)
        
        logger.info(f"Found {len(datasets)} datasets in registry")
        
        for dataset in datasets:
            logger.info(f"Processing dataset: {dataset.get('name', 'Unknown')}")
            
            # Look for organization datasets
            if dataset.get('type') == 'organisation' or 'organisation' in dataset.get('name', '').lower():
                resources = dataset.get('resources', [])
                logger.info(f"Dataset has {len(resources)} resources")
                
                for resource in resources:
                    resource_format = resource.get('format', '').lower()
                    resource_url = resource.get('url', '')
                    
                    logger.info(f"Processing resource: {resource.get('name', 'Unknown')} (format: {resource_format})")
                    
                    if resource_format == 'xml' and resource_url:
                        xml_content = self.fetch_organization_xml(resource_url)
                        if xml_content:
                            organizations = self.parse_organization_xml(xml_content)
                            logger.info(f"Parsed {len(organizations)} organizations from XML")
                            
                            # Find the specific organization
                            for org in organizations:
                                org_id = org.get('iati_identifier', '')
                                org_name = org.get('name', '')
                                
                                logger.info(f"Checking organization: {org_name} (ID: {org_id})")
                                
                                # Try different matching strategies
                                if (org_id == org_identifier or 
                                    org_identifier in org_id or 
                                    org_id.endswith(org_identifier) or
                                    org_identifier.lower() in org_name.lower()):
                                    
                                    logger.info(f"Found matching organization: {org_name}")
                                    return org
        
        # If still no match, try a broader search for well-known organizations
        logger.info("Trying well-known organization mappings...")
        well_known_orgs = {
            '44000': {
                'iati_identifier': '44000',
                'name': 'World Bank',
                'organization_type': 'multilateral',
                'website': 'https://www.worldbank.org',
                'contact_email': '',
                'contact_phone': '',
                'address': '1818 H Street NW, Washington, DC 20433, USA',
                'country': 'United States',
                'description': 'The World Bank is an international financial institution that provides loans and grants to the governments of low- and middle-income countries for the purpose of pursuing capital projects.'
            },
            'GB-GOV-1': {
                'iati_identifier': 'GB-GOV-1',
                'name': 'Department for International Development',
                'organization_type': 'government',
                'website': 'https://www.gov.uk/government/organisations/department-for-international-development',
                'contact_email': '',
                'contact_phone': '',
                'address': 'London, United Kingdom',
                'country': 'United Kingdom',
                'description': 'UK Department for International Development'
            },
            'US-GOV-1': {
                'iati_identifier': 'US-GOV-1',
                'name': 'United States Agency for International Development',
                'organization_type': 'government',
                'website': 'https://www.usaid.gov',
                'contact_email': '',
                'contact_phone': '',
                'address': 'Washington, DC, United States',
                'country': 'United States',
                'description': 'United States Agency for International Development'
            }
        }
        
        if org_identifier in well_known_orgs:
            logger.info(f"Found well-known organization mapping for: {org_identifier}")
            return well_known_orgs[org_identifier]
        
        logger.warning(f"No organization data found for identifier: {org_identifier}")
        return None
    
    def _process_datastore_org_data(self, org_data: Dict) -> Dict:
        """Process organization data from IATI datastore format"""
        try:
            return {
                'iati_identifier': org_data.get('organisation_identifier', ''),
                'name': org_data.get('name', {}).get('narrative', [{}])[0].get('text', ''),
                'organization_type': self._map_iati_org_type(org_data.get('organisation_type', {}).get('code', '')),
                'website': org_data.get('website', ''),
                'contact_email': '',  # Not typically in datastore format
                'contact_phone': '',  # Not typically in datastore format
                'address': '',        # Not typically in datastore format
                'country': '',        # Not typically in datastore format
                'description': ''     # Not typically in datastore format
            }
        except Exception as e:
            logger.error(f"Error processing datastore organization data: {str(e)}")
            return None 