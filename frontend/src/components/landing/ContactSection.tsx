"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Mail, Building2, Globe, Users } from "lucide-react";

const audienceTypes = [
  {
    icon: Building2,
    label: "Governments",
    description: "National ministries and agencies managing development finance",
  },
  {
    icon: Globe,
    label: "Development Partners",
    description: "Bilateral and multilateral donors, implementing organisations",
  },
  {
    icon: Users,
    label: "Researchers & Civil Society",
    description: "Organisations working on transparency and accountability",
  },
];

export function ContactSection() {
  return (
    <section id="contact-section" className="w-full bg-white px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Get in Touch
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Interested in learning more about the platform or discussing how it could
            support your development finance management needs? We welcome inquiries
            from governments, development partners, and civil society organisations.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="border-border bg-white p-6 md:p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    Send us an email
                  </h3>
                  <p className="text-muted-foreground">
                    Click the button below to open your email client with our contact address pre-filled.
                  </p>
                </div>

                <Button
                  asChild
                  className="w-full gap-2 bg-gray-900 hover:bg-black"
                >
                  <a
                    href="mailto:leigh.h.mitchell@icloud.com?subject=Inquiry%20about%20aether%20DFMIS"
                  >
                    <Mail className="h-4 w-4" />
                    Send Message
                  </a>
                </Button>

              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mb-8">
              <h3 className="mb-4 text-xl font-semibold text-foreground">
                Who This Platform Serves
              </h3>
              <p className="text-muted-foreground">
                The system is designed to support coordination between multiple
                stakeholder types involved in development finance management.
              </p>
            </div>

            {audienceTypes.map((audience, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="group border-border bg-white p-5 transition-all duration-300 hover:border-input hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white"
                    >
                      <audience.icon className="h-5 w-5" />
                    </motion.div>
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground transition-colors group-hover:text-foreground">
                        {audience.label}
                      </h4>
                      <p className="text-body text-muted-foreground">{audience.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

          </motion.div>
        </div>
      </div>
    </section>
  );
}
