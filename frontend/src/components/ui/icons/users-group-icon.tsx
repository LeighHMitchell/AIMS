"use client";

import { forwardRef, useImperativeHandle, useCallback } from "react";
import { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const UsersGroupIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      animate(
        ".user-center",
        { y: -2, scale: 1.05 },
        { duration: 0.3, ease: "easeOut" },
      );
      animate(
        ".user-left",
        { x: -1, scale: 1.02 },
        { duration: 0.3, ease: "easeOut" },
      );
      animate(
        ".user-right",
        { x: 1, scale: 1.02 },
        { duration: 0.3, ease: "easeOut" },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(
        ".user-center",
        { y: 0, scale: 1 },
        { duration: 0.2, ease: "easeOut" },
      );
      animate(
        ".user-left",
        { x: 0, scale: 1 },
        { duration: 0.2, ease: "easeOut" },
      );
      animate(
        ".user-right",
        { x: 0, scale: 1 },
        { duration: 0.2, ease: "easeOut" },
      );
    }, [animate]);

    useImperativeHandle(ref, () => ({
      startAnimation: start,
      stopAnimation: stop,
    }));

    return (
      <motion.svg
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`cursor-pointer ${className}`}
        style={{ overflow: "visible" }}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        {/* Center user */}
        <motion.g className="user-center" style={{ transformOrigin: "center" }}>
          <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
          <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
        </motion.g>
        {/* Right user */}
        <motion.g className="user-right" style={{ transformOrigin: "center" }}>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
        </motion.g>
      </motion.svg>
    );
  },
);

UsersGroupIcon.displayName = "UsersGroupIcon";
export default UsersGroupIcon;
