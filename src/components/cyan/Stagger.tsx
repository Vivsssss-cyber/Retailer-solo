"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";

export function Stagger({
  children,
  delay = 0.06,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  if (reduce)
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  style,
  y = 12,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce)
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );

  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        // Full transform string = hardware-accelerated path
        hidden: {
          opacity: 0,
          transform: `translateY(${y}px) scale(0.98)`,
        },
        show: {
          opacity: 1,
          transform: "translateY(0px) scale(1)",
          transition: {
            duration: 0.28,
            ease: [0.23, 1, 0.32, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`sv-surface ${className ?? ""}`}
      style={{
        transition:
          "transform 200ms var(--sv-ease-out, cubic-bezier(0.23,1,0.32,1)), box-shadow 200ms ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
