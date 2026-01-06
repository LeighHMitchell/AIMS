"use client";

import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "What is a Development Finance Management Information System (DFMIS)?",
    answer:
      "A DFMIS is a comprehensive platform designed to help governments and development partners manage, track, and report on development finance flows. It provides tools for activity planning, transaction recording, budget tracking, and performance monitoring, ensuring that development resources are managed transparently and effectively.",
  },
  {
    question: "How does this system differ from a traditional aid database?",
    answer:
      "Unlike traditional aid databases that primarily store historical data, this DFMIS is an active management tool. It supports real-time data entry, validation workflows, multi-stakeholder collaboration, and automated reporting. It's designed for operational use by both government and donor staff, not just for archival or retrospective analysis.",
  },
  {
    question: "Who can access the system?",
    answer:
      "Access is role-based and determined by the system administrator. Typically, government officials, donor representatives, and implementing partners receive accounts with permissions appropriate to their responsibilities. Certain aggregate data and reports may also be made publicly available to support transparency objectives.",
  },
  {
    question: "What data is public versus restricted?",
    answer:
      "Public data typically includes aggregate financial flows, project summaries, and sector-level reporting aligned with government transparency commitments. Restricted data may include detailed transaction records, internal comments, contact information, and draft activities pending approval. The system administrator configures these boundaries based on national policy.",
  },
  {
    question: "Is the system aligned with the IATI Standard?",
    answer:
      "Yes. The platform is built to comply with IATI Standard v2.03, enabling data to be published to the IATI Registry. This includes support for IATI codelists, activity identifiers, transaction types, and XML export functionality. Alignment with IATI supports interoperability and international reporting obligations.",
  },
  {
    question: "Does this replace or complement existing government systems?",
    answer:
      "The DFMIS is designed to complement existing public financial management systems. It can integrate with national budgeting and treasury systems where appropriate, while providing specialized functionality for external development finance that may not be covered by standard government accounting platforms.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full bg-white px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center md:mb-16"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto max-w-2xl text-base text-gray-600 md:text-lg">
            Common questions about the Development Finance Management Information System
            and how it supports transparency and coordination.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <Card className="overflow-hidden border-gray-200 bg-white transition-all hover:border-blue-200 hover:shadow-md">
                  <motion.button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-4 text-left md:p-6"
                    whileHover={{
                      backgroundColor: "rgba(59, 130, 246, 0.03)",
                    }}
                  >
                    <span className="pr-4 text-base font-semibold text-gray-900 md:text-lg">
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 p-4 md:p-6">
                          <motion.p
                            initial={{ y: -10 }}
                            animate={{ y: 0 }}
                            className="text-sm text-gray-600 md:text-base leading-relaxed"
                          >
                            {faq.answer}
                          </motion.p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
