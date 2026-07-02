"use client";

import { motion } from "framer-motion";

/** Animated gradient-mesh backdrop used behind hero sections. */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(263 90% 63% / 0.35), transparent 70%)" }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10rem] top-10 h-[32rem] w-[32rem] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, hsl(173 80% 45% / 0.28), transparent 70%)" }}
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-1/3 h-[34rem] w-[34rem] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, hsl(280 90% 55% / 0.25), transparent 70%)" }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 grid-overlay" />
    </div>
  );
}
