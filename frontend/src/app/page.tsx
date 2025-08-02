'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Database, Globe, Building2, TrendingUp, Users, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">AIMS v1.1</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#analytics" className="text-gray-600 hover:text-gray-900 transition-colors">Analytics</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#partners" className="text-gray-600 hover:text-gray-900 transition-colors">Partners</a>
              <Button 
                variant="ghost"
                onClick={() => router.push('/login')}
                className="text-gray-900 hover:text-gray-700"
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-gray-900">AIMS v1.1</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-900 mb-8 leading-tight tracking-tight">
              Aid Information Management,<br />
              Activity tracking, Financial<br />
              reconciliation, Analytics,<br />
              Reporting & your own IATI<br />
              compliance made for{' '}
              <span className="text-blue-600">Development Partners</span>
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Button 
                onClick={() => router.push('/demo')}
                variant="outline"
                className="bg-white border-gray-200 text-gray-900 hover:bg-gray-50 px-6 py-3"
              >
                Talk to implementers
              </Button>
              <Button 
                onClick={() => router.push('/login')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3"
              >
                Start free trial
              </Button>
            </div>
            
            <p className="text-gray-600 mb-20">
              Start free trial, no credit card required.
            </p>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div>
                <div className="text-gray-500 text-sm mb-2">Activities</div>
                <div className="text-2xl md:text-3xl font-semibold text-gray-900">2,400+</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-2">Partner orgs</div>
                <div className="text-2xl md:text-3xl font-semibold text-gray-900">1,200+</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-2">Transactions</div>
                <div className="text-2xl md:text-3xl font-semibold text-gray-900">45K</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-2">Transaction value</div>
                <div className="text-2xl md:text-3xl font-semibold text-gray-900">$2.1B</div>
              </div>
            </div>
          </div>

          {/* Visual Element - Dashboard Preview */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none hidden lg:block">
            <div className="relative h-full">
              {/* Simulated dashboard elements */}
              <div className="absolute top-20 right-20 w-96 h-64 bg-white rounded-lg shadow-xl border transform rotate-3">
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-gray-100 rounded mb-4 w-2/3"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-blue-50 rounded"></div>
                    <div className="h-20 bg-green-50 rounded"></div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-40 right-40 w-80 h-48 bg-white rounded-lg shadow-lg border transform -rotate-2">
                <div className="p-4">
                  <div className="h-3 bg-gray-200 rounded mb-3 w-2/3"></div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-100 rounded w-full"></div>
                    <div className="h-2 bg-gray-100 rounded w-4/5"></div>
                    <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                  </div>
                  <div className="mt-4 h-16 bg-gradient-to-r from-blue-100 to-green-100 rounded"></div>
                </div>
              </div>

              <div className="absolute top-64 right-12 w-72 h-40 bg-white rounded-lg shadow-md border transform rotate-1">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    <div className="w-6 h-6 bg-green-100 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-12 bg-blue-50 rounded"></div>
                    <div className="h-12 bg-yellow-50 rounded"></div>
                    <div className="h-12 bg-green-50 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
              Everything you need for aid management
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From activity planning to financial reporting, AIMS provides comprehensive tools for development partners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Activity Management</h3>
              <p className="text-gray-600">Track and manage development activities from planning to completion with IATI compliance built-in.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Financial Tracking</h3>
              <p className="text-gray-600">Monitor budgets, commitments, disbursements, and expenditures with real-time financial analytics.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Partner Coordination</h3>
              <p className="text-gray-600">Collaborate with implementing partners, government agencies, and donor organizations seamlessly.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">IATI Compliance</h3>
              <p className="text-gray-600">Automatically generate IATI-compliant reports and maintain transparency standards.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics Dashboard</h3>
              <p className="text-gray-600">Get insights with comprehensive analytics, charts, and reporting capabilities.</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <ChevronRight className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Workflow Automation</h3>
              <p className="text-gray-600">Streamline approval processes and automate routine tasks to increase efficiency.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
            Ready to modernize your aid management?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join development partners already using AIMS to increase transparency and efficiency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => router.push('/login')}
              className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3"
            >
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800 px-8 py-3"
            >
              Schedule demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-semibold text-gray-900">AIMS</span>
                <p className="text-xs text-gray-500">Aid Information Management System</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 AIMS. Built for development partners worldwide.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}