"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div 
      className="min-h-screen bg-white"
      style={{ 
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
      }}
    >
      {/* Header */}
      <nav className="border-b border-gray-200 sticky top-0 z-50 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/images/Logo - No Text 2.jpeg" 
                alt="æther logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="font-bold text-xl text-gray-900">æther</span>
            </div>
            <Button 
              onClick={() => router.push('/login')}
              variant="outline"
              className="border-gray-300"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PRIVACY POLICY
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Aid Information Management System (AIMS)
          </p>
          <p className="text-sm text-gray-500 mb-12">
            Last updated: {currentDate}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              This Privacy Policy explains how personal data is collected, used, stored, and disclosed through the Aid Information Management System (AIMS).
            </p>
            <p className="text-gray-700 leading-relaxed">
              AIMS is designed primarily to manage organisational and programmatic data related to development cooperation and humanitarian assistance. Personal data collection is limited to what is necessary for platform operation, accountability, and security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data Controller</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The data controller for personal data processed through AIMS is John Doe.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Privacy-related enquiries may be directed to <a href="mailto:privacy@aether.org" className="text-blue-600 hover:text-blue-800 underline">privacy@aether.org</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Personal Data Collected</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              AIMS may collect limited personal data, including names, email addresses, organisational affiliations, user roles, and system usage data such as login timestamps and IP addresses. Optional profile information may be provided where enabled.
            </p>
            <p className="text-gray-700 leading-relaxed">
              AIMS does not intentionally collect sensitive personal data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Purpose of Processing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Personal data is used solely for legitimate operational purposes, including user authentication, access control, audit trails, system security, administrative communication, and compliance with accountability requirements.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Personal data is not used for marketing, advertising, or profiling.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Legal Basis for Processing</h2>
            <p className="text-gray-700 leading-relaxed">
              Personal data is processed in accordance with Australian privacy law and, where applicable, comparable international frameworks. Processing is based on legitimate operational needs, performance of a service, and compliance with legal and accountability obligations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Personal data may be shared with trusted service providers that support the hosting and operation of AIMS, subject to confidentiality and security safeguards. Data may also be disclosed where required by law or by a competent authority.
            </p>
            <p className="text-gray-700 leading-relaxed">
              AIMS does not sell or trade personal data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Hosting, Data Location, and Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              AIMS is hosted using Supabase, with primary data storage located in Australia. Industry-standard security measures are used, including encrypted storage, access controls, audit logging, and regular backups.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Data may be processed within secure cloud infrastructure subject to appropriate technical and organisational safeguards.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Public Data and Personal Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Programmatic and financial data may be publicly accessible through AIMS. Personal contact details, including email addresses, are not published by default.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Users are responsible for ensuring that any personal information included in publicly released content is lawful, appropriate, and authorised.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              Personal data is retained only for as long as necessary to support platform functionality, accountability, and legal compliance. Inactive accounts may be archived or anonymised in accordance with operational requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Individual Rights</h2>
            <p className="text-gray-700 leading-relaxed">
              Subject to applicable law, users may request access to their personal data, correction of inaccuracies, or deletion where legally permissible. Requests should be submitted to <a href="mailto:privacy@aether.org" className="text-blue-600 hover:text-blue-800 underline">privacy@aether.org</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Cookies and Technical Data</h2>
            <p className="text-gray-700 leading-relaxed">
              AIMS uses essential cookies and similar technologies to support authentication, session management, and platform security. The platform does not use advertising or tracking cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              This Privacy Policy may be updated from time to time. Material changes will be communicated through the platform or published alongside the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              For privacy-related enquiries, please contact <a href="mailto:privacy@aether.org" className="text-blue-600 hover:text-blue-800 underline">privacy@aether.org</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

