"use client";

/**
 * Optional sidebar panel transition: optical flash, LiDAR scan, chromatic aberration,
 * hologram grid + pulse ring, and inner glow burst.
 *
 * Swap in place of `SidebarPanelFlip` when you want the reconstruction/scan effect.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type SidebarPanelScanTransitionProps = {
  panelKey: string;
  children: ReactNode;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function SidebarPanelScanTransition({
  panelKey,
  children,
}: SidebarPanelScanTransitionProps) {
  const reduceMotion = useReducedMotion();

  const enter = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        filter: "blur(22px) brightness(1.65) saturate(1.55)",
      };

  const center = reduceMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        filter: "blur(0px) brightness(1) saturate(1)",
      };

  const exit = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        filter: "blur(18px) brightness(0.55) saturate(0.75)",
      };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <motion.div
        key={`grid-${panelKey}`}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        initial={{ opacity: 0.12 }}
        animate={{ opacity: 0.04 }}
        transition={{ duration: 0.9, ease: EASE }}
        style={{
          backgroundImage:
            "linear-gradient(rgba(153,27,27,0.95) 1px, transparent 1px), linear-gradient(90deg, rgba(153,27,27,0.95) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black 15%, transparent 100%)",
        }}
      />

      <motion.div
        key={`pulse-${panelKey}`}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        initial={{ opacity: 0.85, scale: 0.45 }}
        animate={{ opacity: 0, scale: 1.35 }}
        transition={{ duration: 0.85, ease: EASE }}
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.38) 0%, rgba(239,68,68,0.22) 30%, rgba(34,211,238,0.08) 50%, transparent 70%)",
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={panelKey}
          initial={enter}
          animate={center}
          exit={exit}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : {
                  duration: 0.55,
                  ease: EASE,
                  filter: { duration: 0.5, ease: EASE },
                }
          }
          className="relative z-10 flex min-h-0 flex-1 flex-col will-change-[filter,opacity]"
        >
          {!reduceMotion ? (
            <>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-[-2px] z-30 mix-blend-screen"
                initial={{ opacity: 0.9, x: -14, scale: 1.01 }}
                animate={{ opacity: 0, x: 0, scale: 1 }}
                transition={{ duration: 0.62, ease: EASE }}
                style={{
                  background:
                    "linear-gradient(105deg, transparent 30%, rgba(34,211,238,0.28) 48%, rgba(34,211,238,0.12) 52%, transparent 70%)",
                }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-[-2px] z-30 mix-blend-screen"
                initial={{ opacity: 0.85, x: 14, scale: 1.01 }}
                animate={{ opacity: 0, x: 0, scale: 1 }}
                transition={{ duration: 0.62, ease: EASE }}
                style={{
                  background:
                    "linear-gradient(75deg, transparent 30%, rgba(248,113,113,0.32) 48%, rgba(248,113,113,0.14) 52%, transparent 70%)",
                }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(34,211,238,0.04) 3px, rgba(34,211,238,0.04) 4px)",
                }}
              />
            </>
          ) : null}

          {!reduceMotion ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 0.32, duration: 0.4 }}
            >
              <motion.div
                className="absolute left-[-15%] right-[-15%] h-[5px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(34,211,238,0.35), rgba(255,255,255,1), rgba(251,191,36,0.95), rgba(255,255,255,0.8), rgba(34,211,238,0.35), transparent)",
                  boxShadow:
                    "0 0 40px rgba(34,211,238,0.75), 0 0 80px rgba(251,191,36,0.45), 0 0 120px rgba(255,255,255,0.2)",
                }}
                initial={{ top: "-10%" }}
                animate={{ top: "110%" }}
                transition={{ duration: 0.72, ease: [0.35, 0, 0.15, 1] }}
              />
              <motion.div
                className="absolute left-0 right-0 h-[28%]"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(34,211,238,0.18), rgba(251,191,36,0.06), transparent)",
                }}
                initial={{ top: "-28%" }}
                animate={{ top: "110%" }}
                transition={{ duration: 0.72, ease: [0.35, 0, 0.15, 1] }}
              />
              <motion.div
                className="absolute left-0 right-0 h-px bg-white/40"
                initial={{ top: "-10%" }}
                animate={{ top: "110%" }}
                transition={{ duration: 0.72, ease: [0.35, 0, 0.15, 1] }}
              />
            </motion.div>
          ) : null}

          {!reduceMotion ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
              initial={{
                boxShadow:
                  "inset 0 0 60px rgba(251,191,36,0.55), inset 0 0 120px rgba(239,68,68,0.28), inset 0 0 180px rgba(34,211,238,0.08)",
              }}
              animate={{
                boxShadow: "inset 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.85, ease: EASE }}
            />
          ) : null}

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
