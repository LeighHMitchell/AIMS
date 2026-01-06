"use client";

import { Card } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Send } from "lucide-react";
import { useState } from "react";
import Script from "next/script";

export function NewsletterSection() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 px-4 py-16">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute right-0 top-0 h-64 w-64 rounded-full bg-gray-200/30 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gray-300/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl">
        <Card className="overflow-hidden border-gray-200 bg-white/80 shadow-lg backdrop-blur-sm">
          <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col justify-center"
            >
              <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                Stay informed on platform developments
              </h2>
              <p className="mb-6 text-gray-600">
                Receive periodic updates on new features, transparency initiatives,
                data releases, and guidance on development finance management.
              </p>

              <div className="flex flex-wrap gap-2">
                {["Platform updates", "Data releases", "Policy guidance"].map(
                  (feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                    >
                      <Check className="h-3 w-3 text-gray-700" />
                      {feature}
                    </motion.div>
                  )
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col justify-center"
            >
              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="space-y-4"
                  >
                    <div id="mc_embed_signup">
                      <style jsx>{`
                        #mc_embed_signup {
                          background: transparent;
                          clear: left;
                          font-family: inherit;
                          width: 100%;
                        }
                        #mc_embed_signup form {
                          padding: 0;
                          margin: 0;
                        }
                        #mc_embed_signup h2,
                        #mc_embed_signup .indicates-required {
                          display: none;
                        }
                        #mc_embed_signup .mc-field-group {
                          margin-bottom: 12px;
                        }
                        #mc_embed_signup .mc-field-group label {
                          display: block;
                          font-size: 14px;
                          font-weight: 500;
                          color: #374151;
                          margin-bottom: 4px;
                        }
                        #mc_embed_signup .mc-field-group input {
                          width: 100%;
                          padding: 10px 12px;
                          border: 1px solid #d1d5db;
                          border-radius: 6px;
                          font-size: 14px;
                          transition: border-color 0.2s;
                          background-color: white;
                        }
                        #mc_embed_signup .mc-field-group input:focus {
                          outline: none;
                          border-color: #374151;
                          box-shadow: 0 0 0 1px #374151;
                        }
                        #mc_embed_signup .button {
                          background-color: #111827;
                          color: white;
                          border: none;
                          padding: 10px 24px;
                          border-radius: 6px;
                          font-size: 14px;
                          font-weight: 500;
                          cursor: pointer;
                          transition: background-color 0.2s;
                          width: 100%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          gap: 8px;
                        }
                        #mc_embed_signup .button:hover {
                          background-color: #1f2937;
                        }
                        #mc_embed_signup .optionalParent {
                          margin-top: 16px;
                        }
                        #mc_embed_signup .foot {
                          margin: 0;
                        }
                        #mc_embed_signup .refferal_badge,
                        #mc_embed_signup .foot p {
                          display: none !important;
                        }
                        #mc_embed_signup #mce-responses {
                          margin: 12px 0;
                        }
                        #mc_embed_signup .response {
                          padding: 8px 12px;
                          border-radius: 4px;
                          font-size: 14px;
                        }
                        #mc_embed_signup #mce-error-response {
                          background-color: #fef2f2;
                          color: #b91c1c;
                          border: 1px solid #fecaca;
                        }
                        #mc_embed_signup #mce-success-response {
                          background-color: #f0fdf4;
                          color: #166534;
                          border: 1px solid #bbf7d0;
                        }
                        .mc-field-group-row {
                          display: flex;
                          gap: 12px;
                        }
                        .mc-field-group-row .mc-field-group {
                          flex: 1;
                        }
                      `}</style>
                      <form
                        action="https://leighmitchell.us5.list-manage.com/subscribe/post?u=2f7f1de1e65f08db9de00f2b1&id=f23e64b79b&f_id=00ae41edf0"
                        method="post"
                        id="mc-embedded-subscribe-form"
                        name="mc-embedded-subscribe-form"
                        className="validate"
                        target="_self"
                        noValidate
                      >
                        <div id="mc_embed_signup_scroll">
                          <div className="mc-field-group-row">
                            <div className="mc-field-group">
                              <label htmlFor="mce-FNAME">First Name</label>
                              <input
                                type="text"
                                name="FNAME"
                                className="text"
                                id="mce-FNAME"
                                placeholder="First name"
                              />
                            </div>
                            <div className="mc-field-group">
                              <label htmlFor="mce-LNAME">Last Name</label>
                              <input
                                type="text"
                                name="LNAME"
                                className="text"
                                id="mce-LNAME"
                                placeholder="Last name"
                              />
                            </div>
                          </div>
                          <div className="mc-field-group">
                            <label htmlFor="mce-EMAIL">Email Address *</label>
                            <input
                              type="email"
                              name="EMAIL"
                              className="required email"
                              id="mce-EMAIL"
                              required
                              placeholder="Enter your email address"
                            />
                          </div>

                          <div id="mce-responses" className="clear foot">
                            <div
                              className="response"
                              id="mce-error-response"
                              style={{ display: "none" }}
                            ></div>
                            <div
                              className="response"
                              id="mce-success-response"
                              style={{ display: "none" }}
                            ></div>
                          </div>

                          <div
                            aria-hidden="true"
                            style={{ position: "absolute", left: "-5000px" }}
                          >
                            <input
                              type="text"
                              name="b_2f7f1de1e65f08db9de00f2b1_f23e64b79b"
                              tabIndex={-1}
                            />
                          </div>

                          <div className="optionalParent">
                            <div className="clear foot">
                              <button
                                type="submit"
                                name="subscribe"
                                id="mc-embedded-subscribe"
                                className="button"
                              >
                                Subscribe to Updates
                                <Send className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>

                    <p className="text-center text-xs text-gray-500">
                      We respect your privacy. Unsubscribe at any time.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center space-y-4 py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      }}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100"
                    >
                      <Check className="h-8 w-8 text-gray-900" />
                    </motion.div>

                    <div className="text-center">
                      <h3 className="mb-2 text-xl font-semibold text-gray-900">
                        Subscription confirmed
                      </h3>
                      <p className="text-sm text-gray-600">
                        Check your inbox to confirm your subscription
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </Card>
      </div>

      <Script
        id="mailchimp-validation"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.fnames = new Array();
            window.ftypes = new Array();
            window.fnames[0] = 'EMAIL';
            window.ftypes[0] = 'email';
            window.fnames[1] = 'FNAME';
            window.ftypes[1] = 'text';
            window.fnames[2] = 'LNAME';
            window.ftypes[2] = 'text';
          `,
        }}
      />
    </section>
  );
}
