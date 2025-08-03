'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Database, Globe, TrendingUp, Users, ChevronRight, Mail } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
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
      toast.success("Thank you for subscribing to æther updates!");
      setEmail("");
      setSubscribing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F5]">
      {/* Clean Navigation */}
      <nav className="bg-[#F8F6F5] border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 text-gray-900">
                <Image 
                  src="/images/aether-logo.png" 
                  alt="æther logo"
                  width={32}
                  height={32}
                  className="w-full h-full"
                />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">æther v1.1</span>
                <p className="text-xs font-bold text-gray-500">Development Finance Information, Simplified.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-bold">Features</a>
              <a href="#analytics" className="text-gray-600 hover:text-gray-900 transition-colors font-bold">Analytics</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors font-bold">About</a>
              <Button 
                onClick={() => router.push('/login')}
                className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-2"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
            {/* Large Logo */}
            <div className="flex justify-start mb-12">
              <div className="w-72 h-72 text-gray-900">
                <Image 
                  src="/images/aether-logo.png" 
                  alt="æther logo"
                  width={288}
                  height={288}
                  className="w-full h-full"
                />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-900 mb-8 leading-tight tracking-tight">
              Track Development Finance Flows with{' '}
              <span className="text-gray-800">Precision and Transparency</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl">
              æther is a purpose-built Development Finance Information Management System (DFMIS) for recipient governments and development partners.
              It enables you to plan activities, track transactions, analyse financial flows, and publish data in line with the IATI Standard.
            </p>

            {/* Newsletter Signup */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-16">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Sign up to receive updates on new features, release timelines, and early access opportunities</span>
              </div>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button 
                  type="submit"
                  disabled={subscribing}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
                >
                  {subscribing ? "Subscribing..." : "Sign Up"}
                </Button>
              </form>
            </div>

            {/* Value Proposition */}
            <div className="mb-20">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
                Designed for Coordination, Built for Scale
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                æther supports effective public financial management and development coordination.
                It provides the tools you need to monitor external financing, engage with partners, and make evidence-based decisions.
              </p>
            </div>
          </div>

          {/* Right Column - Screenshot */}
          <div className="hidden lg:block flex justify-end">
            <div className="relative">
              <Image 
                src="/images/aaether-dashboard-screenshot.png" 
                alt="æther dashboard screenshot"
                width={600}
                height={800}
                className="w-full h-auto"
              />
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





      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-[#F8F6F5] border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 text-gray-900">
                <Image 
                  src="/images/aether-logo.png" 
                  alt="æther logo"
                  width={32}
                  height={32}
                  className="w-full h-full"
                />
              </div>
              <div>
                <span className="text-lg font-semibold text-gray-900">æther</span>
                <p className="text-xs text-gray-500">Development Finance Information Management System</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              © 2025 æther. Built for recipient governments and development partners.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}