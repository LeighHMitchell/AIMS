"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowRight,
  Globe2,
  Shield,
  BarChart3,
  Users,
  Database,
  CheckCircle,
  TrendingUp,
  Target,
  Mail,
  ExternalLink,
  Zap,
  Building2,
  FileText,
  Settings
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setSubscribing(true);
    
    // Simulate subscription
    setTimeout(() => {
      toast.success("Thank you for subscribing to AIMS updates!");
      setEmail("");
      setSubscribing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AIMS</h1>
                <p className="text-xs text-gray-500">Aid Information Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost"
                onClick={() => document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-600 hover:text-gray-900"
              >
                Roadmap
              </Button>
              <Button 
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Access Platform
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Clean & Modern */}
      <section className="pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-blue-600 border-blue-200">
              🚀 Evolving into IATI-Compliant DFMIS
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Modern Aid Information
              <span className="text-blue-600"> Management System</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              AIMS is transforming into a comprehensive Development Finance Management Information System (DFMIS), 
              providing IATI-compliant transparency, real-time analytics, and seamless coordination for development partners.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                size="lg"
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              >
                Access AIMS Platform
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
              >
                Explore Features
              </Button>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">100%</div>
                <div className="text-sm text-gray-600">IATI Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">Real-time</div>
                <div className="text-sm text-gray-600">Data Analytics</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">Multi-user</div>
                <div className="text-sm text-gray-600">Collaboration</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current Capabilities */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Current AIMS Capabilities
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A comprehensive platform for managing development assistance with transparency and efficiency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Activity Management */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Activity Management
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Create, edit, and track development activities with comprehensive autosave and real-time collaboration.
                </p>
              </CardContent>
            </Card>

            {/* IATI Compliance */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  IATI Standards
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Full compliance with International Aid Transparency Initiative standards for data publishing and exchange.
                </p>
              </CardContent>
            </Card>

            {/* Financial Tracking */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Financial Analytics
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Track budgets, disbursements, and expenditures with real-time financial reporting and analytics.
                </p>
              </CardContent>
            </Card>

            {/* Multi-stakeholder */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Multi-stakeholder Platform
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Collaborate across government agencies, development partners, and implementing organizations.
                </p>
              </CardContent>
            </Card>

            {/* Geographic Mapping */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe2 className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Geographic Visualization
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Map activities by location with coverage analysis and geographic aid flow visualization.
                </p>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Secure & Reliable
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Enterprise-grade security with role-based permissions and comprehensive audit trails.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Evolution Roadmap */}
      <section id="roadmap" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Evolution to IATI-Compliant DFMIS
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              AIMS is evolving into a comprehensive Development Finance Management Information System, 
              integrating advanced features for complete aid lifecycle management.
            </p>
          </div>

          <div className="space-y-12">
            {/* Phase 1 - Current */}
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Phase 1: Core AIMS Platform</h3>
                  <Badge variant="outline" className="mt-1 text-green-600 border-green-200">Completed</Badge>
                </div>
              </div>
              <div className="ml-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">Activity Management</div>
                  <div className="text-sm text-gray-600">Comprehensive activity tracking and editing</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">IATI Compliance</div>
                  <div className="text-sm text-gray-600">Full IATI standard implementation</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">Multi-user Collaboration</div>
                  <div className="text-sm text-gray-600">Role-based access and permissions</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">Basic Analytics</div>
                  <div className="text-sm text-gray-600">Financial reporting and dashboards</div>
                </div>
              </div>
            </div>

            {/* Phase 2 - In Progress */}
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Phase 2: Enhanced DFMIS Features</h3>
                  <Badge variant="outline" className="mt-1 text-blue-600 border-blue-200">In Progress</Badge>
                </div>
              </div>
              <div className="ml-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="font-medium text-gray-900 mb-1">Advanced Analytics</div>
                  <div className="text-sm text-gray-600">AI-powered insights and predictive analytics</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="font-medium text-gray-900 mb-1">Budget Integration</div>
                  <div className="text-sm text-gray-600">Government budget system integration</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="font-medium text-gray-900 mb-1">Procurement Module</div>
                  <div className="text-sm text-gray-600">Procurement planning and tracking</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="font-medium text-gray-900 mb-1">Results Framework</div>
                  <div className="text-sm text-gray-600">Impact measurement and evaluation</div>
                </div>
              </div>
            </div>

            {/* Phase 3 - Planned */}
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mr-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Phase 3: Full DFMIS Integration</h3>
                  <Badge variant="outline" className="mt-1 text-purple-600 border-purple-200">Planned 2025</Badge>
                </div>
              </div>
              <div className="ml-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="font-medium text-gray-900 mb-1">Treasury Integration</div>
                  <div className="text-sm text-gray-600">Direct treasury and payment systems</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="font-medium text-gray-900 mb-1">Mobile Applications</div>
                  <div className="text-sm text-gray-600">Field data collection and monitoring</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="font-medium text-gray-900 mb-1">API Ecosystem</div>
                  <div className="text-sm text-gray-600">Third-party integrations and data exchange</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="font-medium text-gray-900 mb-1">Machine Learning</div>
                  <div className="text-sm text-gray-600">Automated risk assessment and optimization</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Why Choose AIMS for Your Development Finance Management?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Real-time Transparency
                    </h3>
                    <p className="text-gray-600">
                      Instant visibility into aid flows, project status, and financial performance across all stakeholders.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Government-Led Coordination
                    </h3>
                    <p className="text-gray-600">
                      Empowers government agencies to lead development coordination with comprehensive oversight capabilities.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Target className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Impact-Driven Results
                    </h3>
                    <p className="text-gray-600">
                      Advanced analytics and reporting tools that translate data into actionable insights for better outcomes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Key Benefits</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Reduce Data Duplication</span>
                  <span className="text-green-600 font-semibold">-75%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Faster Reporting</span>
                  <span className="text-blue-600 font-semibold">5x</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Improved Transparency</span>
                  <span className="text-purple-600 font-semibold">100%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Time Savings</span>
                  <span className="text-orange-600 font-semibold">60%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Development Finance Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join governments and organizations worldwide using AIMS to enhance transparency, 
            improve coordination, and maximize development impact.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => router.push('/login')}
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg"
            >
              Access AIMS Platform
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg"
              onClick={() => window.open('mailto:contact@aims-platform.org', '_blank')}
            >
              <Mail className="mr-2 h-5 w-5" />
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* About */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">AIMS Platform</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                An open, country-adaptable platform evolving into a comprehensive IATI-compliant 
                Development Finance Management Information System.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-blue-600">
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform</h3>
              <div className="space-y-3">
                <a href="/login" className="block text-gray-600 hover:text-blue-600">Access AIMS</a>
                <a href="#features" className="block text-gray-600 hover:text-blue-600">Features</a>
                <a href="#roadmap" className="block text-gray-600 hover:text-blue-600">Development Roadmap</a>
                <a href="mailto:support@aims-platform.org" className="block text-gray-600 hover:text-blue-600">Support</a>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stay Updated</h3>
              <p className="text-gray-600 mb-4">
                Subscribe for updates on AIMS development and DFMIS evolution.
              </p>
              <form onSubmit={handleSubscribe} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-gray-300"
                />
                <Button 
                  type="submit" 
                  disabled={subscribing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {subscribing ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-600">
              &copy; 2024 AIMS Platform. Built for transparency, designed for impact.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}