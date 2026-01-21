"use client";

import { GlowyWavesHero } from "@/components/landing/GlowyWavesHero";
import { WaitlistSignupBlock } from "@/components/landing/WaitlistSignupBlock";
import { FAQSection } from "@/components/landing/FAQSection";
import { NewsletterSection } from "@/components/landing/NewsletterSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <GlowyWavesHero />
      <WaitlistSignupBlock />
      <FAQSection />
      <NewsletterSection />
      <ContactSection />
      <LandingFooter />
    </div>
  );
}
