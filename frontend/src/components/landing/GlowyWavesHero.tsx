"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type Point = {
  x: number;
  y: number;
};

interface WaveConfig {
  offset: number;
  amplitude: number;
  frequency: number;
  color: string;
  opacity: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, staggerChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export function GlowyWavesHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<Point>({ x: 0, y: 0 });
  const targetMouseRef = useRef<Point>({ x: 0, y: 0 });
  const router = useRouter();

  const scrollToContact = () => {
    const contactSection = document.getElementById("contact-section");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let animationId: number;
    let time = 0;

    // Color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
    const computeThemeColors = () => {
      return {
        backgroundTop: "#ffffff",    // White
        backgroundBottom: "#ffffff", // White
        wavePalette: [
          {
            offset: 0,
            amplitude: 70,
            frequency: 0.003,
            color: "rgba(220, 38, 37, 0.6)",  // Primary Scarlet #dc2625
            opacity: 0.4,
          },
          {
            offset: Math.PI / 2,
            amplitude: 90,
            frequency: 0.0026,
            color: "rgba(76, 85, 104, 0.5)",  // Blue Slate #4c5568
            opacity: 0.35,
          },
          {
            offset: Math.PI,
            amplitude: 60,
            frequency: 0.0034,
            color: "rgba(123, 149, 167, 0.5)", // Cool Steel #7b95a7
            opacity: 0.3,
          },
          {
            offset: Math.PI * 1.5,
            amplitude: 80,
            frequency: 0.0022,
            color: "rgba(207, 208, 213, 0.4)", // Pale Slate #cfd0d5
            opacity: 0.25,
          },
          {
            offset: Math.PI * 2,
            amplitude: 55,
            frequency: 0.004,
            color: "rgba(76, 85, 104, 0.4)",   // Blue Slate #4c5568
            opacity: 0.2,
          },
        ] satisfies WaveConfig[],
      };
    };

    const themeColors = computeThemeColors();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const mouseInfluence = prefersReducedMotion ? 10 : 70;
    const influenceRadius = prefersReducedMotion ? 160 : 320;
    const smoothing = prefersReducedMotion ? 0.04 : 0.1;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 0.6; // Only cover top 60% of viewport
    };

    const recenterMouse = () => {
      const centerPoint = { x: canvas.width / 2, y: canvas.height / 2 };
      mouseRef.current = centerPoint;
      targetMouseRef.current = centerPoint;
    };

    const handleResize = () => {
      resizeCanvas();
      recenterMouse();
    };

    const handleMouseMove = (event: MouseEvent) => {
      targetMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseLeave = () => {
      recenterMouse();
    };

    resizeCanvas();
    recenterMouse();

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const drawWave = (wave: WaveConfig) => {
      ctx.save();
      ctx.beginPath();

      for (let x = 0; x <= canvas.width; x += 4) {
        const dx = x - mouseRef.current.x;
        const dy = canvas.height / 2 - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - distance / influenceRadius);
        const mouseEffect =
          influence *
          mouseInfluence *
          Math.sin(time * 0.001 + x * 0.01 + wave.offset);

        const y =
          canvas.height / 2 +
          Math.sin(x * wave.frequency + time * 0.002 + wave.offset) *
            wave.amplitude +
          Math.sin(x * wave.frequency * 0.4 + time * 0.003) *
            (wave.amplitude * 0.45) +
          mouseEffect;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = wave.color;
      ctx.globalAlpha = wave.opacity;
      ctx.shadowBlur = 25;
      ctx.shadowColor = wave.color;
      ctx.stroke();

      ctx.restore();
    };

    const animate = () => {
      time += 1;

      mouseRef.current.x +=
        (targetMouseRef.current.x - mouseRef.current.x) * smoothing;
      mouseRef.current.y +=
        (targetMouseRef.current.y - mouseRef.current.y) * smoothing;

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, themeColors.backgroundTop);
      gradient.addColorStop(1, themeColors.backgroundBottom);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      themeColors.wavePalette.forEach(drawWave);

      animationId = window.requestAnimationFrame(animate);
    };

    animationId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-white"
      role="region"
      aria-label="Hero section"
    >
      {/* Waves section - top portion */}
      <div className="relative h-[60vh] min-h-[400px] bg-white">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        />

        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#4c5568]/[0.035] blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[#7b95a7]/[0.025] blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 h-[400px] w-[400px] rounded-full bg-[#dc2625]/[0.02] blur-[150px]" />
        </div>

        {/* Headline and buttons overlay on waves */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center md:px-8 lg:px-12">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-5xl"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6 inline-flex items-center gap-2"
            >
              <img
                src="/images/aether-logo.png"
                alt="aether logo"
                width="40"
                height="40"
                className="rounded"
              />
              <span className="font-bold text-2xl text-gray-900">aether</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-8 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl lg:text-6xl"
            >
              A transparent system for managing{" "}
              <span className="bg-gradient-to-r from-[#dc2625] via-[#4c5568] to-[#7b95a7] bg-clip-text text-transparent">
                development finance
              </span>
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-black text-white px-8 text-base"
                onClick={() => router.push("/login")}
              >
                Login
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-300 bg-white/60 px-8 text-base text-gray-700 backdrop-blur transition-all hover:border-gray-400 hover:bg-white/80"
                onClick={scrollToContact}
              >
                Contact
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Description section - below waves */}
      <div className="bg-white px-6 py-16 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="mb-8 text-lg text-gray-600 md:text-xl leading-relaxed">
            A purpose-built Development Finance Management Information System for governments,
            donors, and development partners to plan, track, and publish financial flows in
            alignment with international standards.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-gray-900" />
              Government validation
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-gray-900" />
              Donor reporting
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-gray-900" />
              Public transparency
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-gray-900" />
              IATI Standard v2.03
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
