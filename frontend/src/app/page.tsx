"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Users, 
  BarChart3, 
  Globe2, 
  ArrowRight,
  MapPin,
  Target,
  Lightbulb,
  ChevronRight,
  Mail
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
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
      toast.success("Thank you for subscribing! We'll keep you updated on AIMS developments.");
      setEmail("");
      setFirstName("");
      setLastName("");
      setOrganization("");
      setSubscribing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">AIMS</h1>
            </div>
            <div>
              <Button 
                onClick={() => router.push('/login')}
                className="bg-white text-slate-900 hover:bg-slate-100"
              >
                Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2940')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/70" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Your Gateway to Smarter Development Finance
          </h1>
          <p className="text-xl md:text-2xl text-slate-200 mb-10 max-w-3xl mx-auto">
            AIMS is a flexible, country-agnostic platform for tracking development assistance, 
            improving coordination, and driving results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => router.push('/login')}
              className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8 py-6"
            >
              Login to AIMS
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-slate-900 text-lg px-8 py-6"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* Vision Quote Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-2xl md:text-3xl text-slate-700 italic leading-relaxed">
            "When countries own and understand their development finance data, 
            they make better decisions, build stronger systems, and achieve more for their people."
          </blockquote>
          <p className="mt-6 text-lg text-slate-600">
            — A Shared Vision for Effective Aid
          </p>
        </div>
      </section>

      {/* Key Value Highlights */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Transform How You Manage Development Finance
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              AIMS provides the tools and insights needed to maximize the impact of development assistance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                  Who is funding what, where?
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Gain a clear picture of projects, sectors, and regions receiving support—so resources go further.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                  Why does transparency matter?
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Access to timely and accurate aid information builds trust, reduces duplication, and strengthens impact.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Lightbulb className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                  How does AIMS support governments?
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  AIMS empowers ministries and local authorities to take the lead in planning, monitoring, and coordinating external support.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Built for Impact, Designed for Everyone
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <Users className="h-6 w-6 text-blue-600 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Multi-stakeholder Collaboration
                    </h3>
                    <p className="text-slate-600">
                      Bring together government agencies, development partners, and civil society on a single platform.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <BarChart3 className="h-6 w-6 text-green-600 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Real-time Analytics
                    </h3>
                    <p className="text-slate-600">
                      Generate insights with powerful dashboards and reports that inform better decisions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Globe2 className="h-6 w-6 text-purple-600 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Country-Agnostic Design
                    </h3>
                    <p className="text-slate-600">
                      Adaptable to any country's context, governance structure, and development priorities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-96 lg:h-auto">
              <div 
                className="absolute inset-0 bg-cover bg-center rounded-lg shadow-2xl"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2942')",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Development Finance Management?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join governments and organizations worldwide using AIMS to drive transparency and impact.
          </p>
          <Button 
            size="lg"
            onClick={() => router.push('/login')}
            className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8 py-6"
          >
            Get Started with AIMS
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer with Newsletter */}
      <footer className="bg-slate-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* About Section */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">About AIMS</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                AIMS is an open, country-adaptable platform designed to improve transparency 
                and accountability in development cooperation.
              </p>
              <p className="text-slate-600">
                For inquiries, partnerships, or technical support, please contact:{" "}
                <a href="mailto:aims.platform@yourdomain.org" className="text-blue-600 hover:underline">
                  aims.platform@yourdomain.org
                </a>
              </p>
            </div>

            {/* Newsletter Signup */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Stay Updated</h3>
              <p className="text-slate-600 mb-6">
                Subscribe to receive updates on AIMS features, best practices, and success stories.
              </p>
              <form onSubmit={handleSubscribe} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-white"
                  />
                  <Input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email Address*"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white"
                />
                <Input
                  type="text"
                  placeholder="Organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="bg-white"
                />
                <Button 
                  type="submit" 
                  disabled={subscribing}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  {subscribing ? (
                    <>Subscribing...</>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Subscribe to Updates
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-600">
            <p>&copy; 2024 AIMS Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
