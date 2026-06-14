"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type SidebarPanelFlipProps = {
  panelKey: string;
  children: ReactNode;
};

const FLIP_EASE = [0.4, 0, 0.2, 1] as const;

export function SidebarPanelFlip({ panelKey, children }: SidebarPanelFlipProps) {
  const reduceMotion = useReducedMotion();
  const isFireRisk = panelKey === "fire-risk";

  const enterRotateY = isFireRisk ? 88 : -88;
  const exitRotateY = isFireRisk ? -88 : 88;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-visible"
      style={{ perspective: "1200px", perspectiveOrigin: "50% 50%" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={panelKey}
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { rotateY: enterRotateY, opacity: 0, scale: 0.96 }
          }
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { rotateY: 0, opacity: 1, scale: 1 }
          }
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { rotateY: exitRotateY, opacity: 0, scale: 0.96 }
          }
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : {
                  duration: 0.42,
                  ease: FLIP_EASE,
                  opacity: { duration: 0.28, ease: "easeOut" },
                }
          }
          style={{
            transformOrigin: "center center",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden [transform-style:preserve-3d]"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
