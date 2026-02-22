"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  const router = useRouter();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div 
      className="min-h-screen bg-card"
      style={{ 
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
      }}
    >
      {/* Header */}
      <nav className="border-b border-border sticky top-0 z-50 bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/images/Logo - No Text 2.jpeg" 
                alt="æther logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="font-bold text-xl text-foreground">æther</span>
            </div>
            <Button 
              onClick={() => router.push('/login')}
              variant="outline"
              className="border-border"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            TERMS OF SERVICE
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Aid Information Management System (AIMS)
          </p>
          <p className="text-sm text-muted-foreground mb-12">
            Last updated: {currentDate}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-foreground leading-relaxed mb-4">
              The Aid Information Management System (AIMS) is a digital platform designed to support the management, reporting, validation, analysis, and publication of development cooperation and humanitarian assistance data. The platform enables authorised users to record and manage aid activities, financial information, organisational relationships, and related metadata, including publication in alignment with the International Aid Transparency Initiative (IATI) Standard.
            </p>
            <p className="text-foreground leading-relaxed">
              These Terms of Service govern all access to and use of AIMS. By accessing or using the platform, you confirm that you have read, understood, and agreed to be bound by these Terms. If you do not agree, you must not use AIMS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Ownership and Purpose</h2>
            <p className="text-foreground leading-relaxed mb-4">
              AIMS is owned and operated by John Doe.
            </p>
            <p className="text-foreground leading-relaxed mb-4">
              The platform is intended for use by organisations engaged in development cooperation, humanitarian assistance, or public financial management, including government agencies, bilateral and multilateral donors, implementing organisations, and civil society organisations.
            </p>
            <p className="text-foreground leading-relaxed">
              AIMS functions solely as a technical information management system. It does not act as a certifying authority, auditor, regulator, or legal advisor. Responsibility for the accuracy, completeness, legality, and authorisation of all data submitted to AIMS remains with the submitting organisation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Access Model</h2>
            <p className="text-foreground leading-relaxed mb-4">
              AIMS operates as a hybrid system. Certain data is made publicly accessible to support transparency and accountability, while data entry, editing, validation, and administrative functions are restricted to authorised users through role-based access controls.
            </p>
            <p className="text-foreground leading-relaxed">
              Publicly accessible data may include aid activity summaries, financial information, sectoral and geographic allocations, and related metadata.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. User Eligibility and Authority</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Access to AIMS is restricted to users who have been authorised by their organisation. By creating or using an account, you confirm that you are acting within your organisational authority and in accordance with applicable internal policies and legal obligations.
            </p>
            <p className="text-foreground leading-relaxed mb-4">
              You are responsible for maintaining the confidentiality of your login credentials and for all actions taken through your account. Any suspected unauthorised access must be reported promptly.
            </p>
            <p className="text-foreground leading-relaxed">
              AIMS reserves the right to suspend or revoke access where there is evidence of misuse, unauthorised activity, or breach of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Acceptable Use</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Users must use AIMS in a lawful, ethical, and responsible manner. You must not submit content that is knowingly false, misleading, defamatory, or unlawful, nor upload information that you do not have the authority to disclose or publish.
            </p>
            <p className="text-foreground leading-relaxed mb-4">
              You must not attempt to interfere with the security, availability, or integrity of the platform, including attempts to access restricted systems or data.
            </p>
            <p className="text-foreground leading-relaxed">
              AIMS may implement validation rules, audit logging, review workflows, and administrative oversight to maintain platform integrity and data quality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Responsibility</h2>
            <p className="text-foreground leading-relaxed mb-4">
              All data entered into AIMS remains the responsibility of the submitting organisation. This includes activity descriptions, financial figures, organisational relationships, geographic information, and any supporting documentation.
            </p>
            <p className="text-foreground leading-relaxed">
              AIMS may provide validation tools and structured workflows, but it does not guarantee that submitted data is accurate, complete, or compliant with external reporting obligations. Decisions made using data from AIMS are made at the user's own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Publication Authority and Disclaimer</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Users must ensure that they have explicit authority from their organisation to publish any data marked for public release. This includes authority to disclose financial information, programme details, organisational relationships, and documents.
            </p>
            <p className="text-foreground leading-relaxed mb-4">
              AIMS is not responsible for unauthorised publication of data by users. Responsibility for ensuring lawful and authorised publication rests solely with the submitting organisation and the user acting on its behalf.
            </p>
            <p className="text-foreground leading-relaxed">
              Once data is published, it may be accessed, reused, or redistributed by third parties in accordance with open data and transparency principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Intellectual Property</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Users retain ownership of the content and data they submit to AIMS. By submitting content, users grant AIMS a non-exclusive, royalty-free, worldwide licence to store, process, analyse, display, publish, and export that content for the purposes of operating the platform and supporting transparency and interoperability.
            </p>
            <p className="text-foreground leading-relaxed">
              All software, system architecture, interfaces, and documentation associated with AIMS remain the intellectual property of John Doe unless otherwise stated.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Availability and Changes</h2>
            <p className="text-foreground leading-relaxed mb-4">
              AIMS is provided on an as-is and as-available basis. While reasonable efforts are made to ensure reliability, uninterrupted or error-free operation is not guaranteed.
            </p>
            <p className="text-foreground leading-relaxed">
              The platform owner may modify features, update functionality, impose reasonable usage limits, or temporarily suspend access for maintenance, security, or operational reasons. Advance notice will be provided where reasonably practicable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
            <p className="text-foreground leading-relaxed mb-4">
              To the maximum extent permitted by law, John Doe is not liable for indirect, incidental, or consequential losses arising from the use of AIMS, including losses resulting from reliance on data entered or published by users.
            </p>
            <p className="text-foreground leading-relaxed">
              Nothing in these Terms limits liability that cannot be excluded under Australian law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Termination</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Users may cease using AIMS at any time. Access may be suspended or terminated where these Terms are breached, where continued access presents a legal or security risk, or where required by law.
            </p>
            <p className="text-foreground leading-relaxed">
              Termination of access does not automatically result in deletion of data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Governing Law</h2>
            <p className="text-foreground leading-relaxed">
              These Terms are governed by the laws of Australia. Any disputes arising in connection with AIMS are subject to the exclusive jurisdiction of Australian courts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact</h2>
            <p className="text-foreground leading-relaxed">
              For enquiries relating to these Terms of Service, please contact <a href="mailto:contact@aether.org" className="text-blue-600 hover:text-blue-800 underline">contact@aether.org</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


