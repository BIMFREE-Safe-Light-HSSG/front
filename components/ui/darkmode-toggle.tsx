"use client";

import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDark = isMounted && resolvedTheme === "dark";

  const handleDragEnd = (_: any, info: any) => {
    // 드래그 거리 기준
    if (info.offset.x > 15) {
      setTheme("light");
    } else if (info.offset.x < -15) {
      setTheme("dark");
    }
  };

  if (!isMounted) {
    return (
      <div className="w-28 h-10 flex items-center bg-muted rounded-full px-2 relative">
        <div className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="relative w-28 h-10 bg-muted rounded-full p-1 select-none">
      {/* 중앙 구분선 */}
      <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-border/50" />

      {/* 드래그 배경 */}
      <motion.div
        drag="x"
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-full"
        animate={{
          x: isDark ? -8 : 8,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="absolute inset-0 bg-background/50 rounded-full" />
      </motion.div>

      {/* 아이콘 레이아웃 */}
      <div className="relative w-full h-full flex items-center justify-between px-2 z-10 pointer-events-none">
        <div className="flex-1 flex justify-center">
          <Moon
            className={`w-5 h-5 transition-colors ${
              isDark ? "text-amber-400" : "text-muted-foreground"
            }`}
          />
        </div>
        <div className="flex-1 flex justify-center">
          <Sun
            className={`w-5 h-5 transition-colors ${
              !isDark ? "text-amber-400" : "text-muted-foreground"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
