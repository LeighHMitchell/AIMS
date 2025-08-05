"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
      toast.success("Thank you for subscribing to updates!");
      setEmail("");
      setSubscribing(false);
    }, 1000);
  };

  // Aether logo component
  const AetherLogo = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/images/aether-logo.png" 
        alt="æther logo" 
        width="32" 
        height="32" 
        className="mr-2"
      />
      <span className="font-bold text-2xl">æther</span>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F5F4' }}>
      {/* Navigation */}
      <nav className="border-b border-gray-100 sticky top-0 z-50" style={{ backgroundColor: '#F6F5F4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <AetherLogo />
              <div className="text-sm text-gray-900 font-bold">
                v1.1
              </div>
              <div className="hidden md:block text-sm text-gray-900 font-bold">
                Development Finance Information, Simplified.
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Button 
                onClick={() => router.push('/login')}
                className="bg-black hover:bg-gray-800 text-white"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Content */}
            <div>
              <div className="mb-8">
                <AetherLogo className="text-gray-900 mb-2" />
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Track Development Finance Flows <span className="text-gray-600">with Precision and Transparency</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-12 leading-relaxed max-w-xl">
                <span className="font-bold">æther</span> is a purpose-built Development Finance Information Management System (DFMIS) for recipient governments and 
                development partners. It enables you to plan activities, track transactions, analyse financial flows, and publish data in line with 
                the IATI Standard.
              </p>

              {/* Email Signup */}
              <div className="mb-12">
                <p className="text-sm text-gray-600 mb-4">
                  Sign up to receive updates on new features, release timelines, and early access opportunities
                </p>
                <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={subscribing}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6"
                  >
                    {subscribing ? "..." : "Sign Up"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Right side - Activity Editor Screenshot */}
            <div className="flex justify-center">
              <img 
                src="/images/Activity Editor NEW.png" 
                alt="æther Activity Editor" 
                className="w-full max-w-lg h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Designed for Coordination Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Designed for Coordination, Built for Scale
              </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              <span className="font-bold">æther</span> supports effective public financial management and development coordination. It provides the tools you need to monitor external financing, engage with partners, and make evidence-based decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F6F5F4' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="mb-8">
              <AetherLogo className="text-gray-900 justify-center" />
            </div>

            <div className="text-center text-gray-500 text-sm">
              © 2025 <span className="font-bold">æther</span>. Built for recipient governments and development partners.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}