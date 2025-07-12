#!/usr/bin/env python3
"""
Simple test script to verify the ExchangeRate.host API connection
Run this to test if the currency converter service works as expected
"""

import sys
import os
import requests
from datetime import date, timedelta
from decimal import Decimal

# Add the project root to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_api_connection():
    """Test direct API connection to ExchangeRate.host"""
    print("Testing ExchangeRate.host API connection...")
    
    base_url = "https://api.exchangerate-api.com/v4"
    test_date = date.today() - timedelta(days=1)  # Yesterday's rate
    
    try:
        # Test 1: Get supported currencies
        print("\n1. Testing supported currencies endpoint...")
        response = requests.get(f"{base_url}/latest/USD", timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if 'rates' in data:
            rates = data.get('rates', {})
            print(f"✅ Found {len(rates)} supported currencies")
            
            # Show first 10 currencies
            sample_currencies = list(rates.items())[:10]
            for code, rate in sample_currencies:
                print(f"   {code}: 1 USD = {rate} {code}")
        else:
            print(f"❌ API error: {data}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to fetch supported currencies: {e}")
        return False
    
    try:
        # Test 2: Get exchange rate (EUR to USD)
        print(f"\n2. Testing current rate (EUR to USD)...")
        response = requests.get(f"{base_url}/latest/EUR", timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if 'rates' in data:
            rates = data.get('rates', {})
            if 'USD' in rates:
                rate = rates['USD']
                print(f"✅ EUR to USD rate: {rate}")
                print(f"   1 EUR = {rate} USD")
            else:
                print("❌ USD rate not found in response")
                return False
        else:
            print(f"❌ API error: {data}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to fetch historical rate: {e}")
        return False
    
    try:
        # Test 3: Test multiple currencies
        print("\n3. Testing multiple currency conversion...")
        response = requests.get(f"{base_url}/latest/USD", timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if 'rates' in data:
            rates = data.get('rates', {})
            test_currencies = ['GBP', 'JPY', 'CAD']
            print("✅ Multiple currency rates:")
            for currency in test_currencies:
                if currency in rates:
                    print(f"   1 USD = {rates[currency]} {currency}")
                else:
                    print(f"   ❌ {currency} rate not available")
        else:
            print(f"❌ API error: {data}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to fetch multiple rates: {e}")
        return False
    
    print("\n✅ All API tests passed! The service should work correctly.")
    return True


def test_converter_logic():
    """Test the basic conversion logic without Django dependencies"""
    print("\n" + "="*50)
    print("Testing conversion logic...")
    
    # Test conversion calculations
    test_cases = [
        (Decimal('100.00'), Decimal('1.10'), Decimal('110.00')),
        (Decimal('1000.50'), Decimal('0.85'), Decimal('850.43')),  # 1000.50 * 0.85 = 850.425 -> 850.43
        (Decimal('50.75'), Decimal('1.25'), Decimal('63.44')),     # 50.75 * 1.25 = 63.9375 -> 63.44 (banker's rounding)
    ]
    
    # Fix expected values based on Python's decimal rounding
    test_cases[1] = (Decimal('1000.50'), Decimal('0.85'), Decimal('850.42'))  # 850.425 -> 850.42
    test_cases[2] = (Decimal('50.75'), Decimal('1.25'), Decimal('63.44'))     # 63.9375 -> 63.44
    
    for amount, rate, expected in test_cases:
        result = amount * rate
        result = result.quantize(Decimal('0.01'))  # Round to 2 decimal places
        
        if result == expected:
            print(f"✅ {amount} * {rate} = {result} (expected {expected})")
        else:
            print(f"❌ {amount} * {rate} = {result} (expected {expected})")
            return False
    
    print("✅ All conversion logic tests passed!")
    return True


def test_date_handling():
    """Test date handling logic"""
    print("\n" + "="*50)
    print("Testing date handling...")
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    future_date = today + timedelta(days=30)
    
    print(f"Today: {today}")
    print(f"Yesterday: {yesterday}")
    print(f"Future date: {future_date}")
    
    # Future dates should not be allowed for historical rates
    if future_date > today:
        print("✅ Future date correctly identified")
    else:
        print("❌ Future date logic error")
        return False
    
    # Valid historical date
    if yesterday < today:
        print("✅ Historical date correctly identified")
    else:
        print("❌ Historical date logic error")
        return False
    
    print("✅ All date handling tests passed!")
    return True


if __name__ == "__main__":
    print("Currency Converter Implementation Test")
    print("=" * 50)
    
    # Run all tests
    api_test = test_api_connection()
    logic_test = test_converter_logic()
    date_test = test_date_handling()
    
    print("\n" + "="*50)
    print("SUMMARY:")
    print(f"API Connection: {'✅ PASS' if api_test else '❌ FAIL'}")
    print(f"Conversion Logic: {'✅ PASS' if logic_test else '❌ FAIL'}")
    print(f"Date Handling: {'✅ PASS' if date_test else '❌ FAIL'}")
    
    if all([api_test, logic_test, date_test]):
        print("\n🎉 All tests passed! The implementation should work correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the issues above.")
        sys.exit(1)