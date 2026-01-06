"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ExternalLink } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  {
    title: "Platform",
    links: [
      { label: "Login", href: "/login" },
      { label: "Features", href: "#" },
      { label: "Documentation", href: "#" },
    ],
  },
  {
    title: "Standards",
    links: [
      { label: "IATI Standard", href: "https://iatistandard.org", external: true },
      { label: "IATI Registry", href: "https://iatiregistry.org", external: true },
      { label: "d-portal", href: "https://d-portal.org", external: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "#" },
      { label: "Contact", href: "#contact-section" },
    ],
  },
];

export function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <footer
      aria-labelledby="footer-heading"
      className="relative w-full overflow-hidden border-t border-gray-200 bg-gray-50"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gray-200/20 blur-[160px]"
          animate={
            shouldReduceMotion
              ? undefined
              : { opacity: [0.2, 0.35, 0.2], scale: [0.9, 1.05, 0.95] }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 12, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>

      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="mb-4 flex items-center gap-2">
              <img
                src="/images/aether-logo.png"
                alt="aether logo"
                width="28"
                height="28"
                className="rounded"
              />
              <span className="font-bold text-xl text-gray-900">aether</span>
            </div>

            <p className="mb-4 max-w-md text-sm text-gray-600 leading-relaxed">
              A Development Finance Management Information System built for
              transparency, coordination, and standards compliance. Aligned with
              IATI Standard v2.03 for international interoperability.
            </p>

            <p className="text-xs text-gray-500">
              Designed for recipient governments and development partners.
            </p>
          </motion.div>

          {footerLinks.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: sectionIndex * 0.1 }}
            >
              <h4 className="mb-4 text-sm font-semibold text-gray-900">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <motion.li
                    key={link.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: linkIndex * 0.05 }}
                  >
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-gray-600 transition-colors hover:text-gray-900"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : link.href.startsWith("#") ? (
                      <a
                        href={link.href}
                        className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                      >
                        {link.label}
                      </Link>
                    )}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="my-8 h-px bg-gray-200"
        />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="text-sm text-gray-500"
          >
            <span>&copy; {new Date().getFullYear()} aether. All rights reserved.</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
          >
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full border-gray-300"
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <motion.div
                animate={
                  shouldReduceMotion ? undefined : { y: [0, -3, 0] }
                }
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { repeat: Infinity, duration: 1.5 }
                }
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </motion.div>
            </Button>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
