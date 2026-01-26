"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Mail, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { apiFetch } from '@/lib/api-fetch';

export function WaitlistSignupBlock() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setEmail("");
    } catch {
      setError('Failed to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative w-full overflow-hidden px-4 py-16" style={{ background: "linear-gradient(to bottom right, rgba(220, 38, 37, 0.05), #f1f4f8, rgba(220, 38, 37, 0.1))" }}>
      {/* Animated background elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute right-0 top-0 h-64 w-64 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(220, 38, 37, 0.05)" }}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-0 left-0 h-64 w-64 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(220, 38, 37, 0.05)" }}
      />

      <div className="relative mx-auto max-w-4xl">
        <Card className="overflow-hidden shadow-xl backdrop-blur-sm" style={{ backgroundColor: "rgba(241, 244, 248, 0.5)", borderColor: "rgba(207, 208, 213, 0.5)" }}>
          <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
            {/* Left side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col justify-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Badge className="mb-4 w-fit" style={{ backgroundColor: "rgba(220, 38, 37, 0.1)", color: "#dc2625" }}>
                  <Sparkles className="mr-1 h-3 w-3" />
                  Coming Soon
                </Badge>
              </motion.div>

              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "#4c5568" }}>
                Join the Waitlist
              </h2>
              <p className="mb-6" style={{ color: "#7b95a7" }}>
                Be the first to know when we launch. Get exclusive early access
                and updates delivered directly to your inbox.
              </p>
            </motion.div>

            {/* Right side - Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col justify-center"
            >
              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <motion.div
                        animate={
                          isFocused
                            ? {
                                scale: 1.02,
                                boxShadow:
                                  "0 0 0 3px rgba(var(--primary), 0.1)",
                              }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.2 }}
                        className="rounded-md"
                      >
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "#7b95a7" }} />
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </motion.div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="group w-full"
                      style={{ backgroundColor: "#dc2625", color: "#f1f4f8" }}
                      disabled={!email || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>Joining...</span>
                        </>
                      ) : (
                        <>
                          <span>Join Waitlist</span>
                          <motion.div
                            className="ml-2"
                            animate={{ x: [0, 5, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.5,
                              ease: "easeInOut",
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </motion.div>
                        </>
                      )}
                    </Button>

                    {error && (
                      <p className="text-center text-sm" style={{ color: "#dc2625" }}>
                        {error}
                      </p>
                    )}

                    <p className="text-center text-xs" style={{ color: "#7b95a7" }}>
                      By joining, you agree to our Privacy Policy
                    </p>
                  </motion.form>
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
                      className="flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(220, 38, 37, 0.1)" }}
                    >
                      <Check className="h-8 w-8" style={{ color: "#dc2625" }} />
                    </motion.div>

                    <div className="text-center">
                      <h3 className="mb-2 text-xl font-semibold" style={{ color: "#4c5568" }}>
                        You're on the list!
                      </h3>
                      <p className="text-sm" style={{ color: "#7b95a7" }}>
                        We'll notify you as soon as we launch
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </Card>
      </div>
    </section>
  );
}
