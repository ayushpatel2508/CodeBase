"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type AnimatedGridPatternProps = {
  className?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
};

function getSquarePosition(index: number) {
  return {
    x: (index * 7 + 3) % 28,
    y: (index * 11 + 5) % 18,
  };
}

export function AnimatedGridPattern({
  className,
  width = 48,
  height = 48,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 120,
  maxOpacity = 0.18,
  duration = 3,
  repeatDelay = 0.8,
}: AnimatedGridPatternProps) {
  const id = "codechat-animated-grid";
  const squares = Array.from({ length: numSquares }, (_, index) => ({
    id: index,
    ...getSquarePosition(index),
  }));

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-white/10 stroke-white/10",
        className
      )}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map((square) => (
          <motion.rect
            key={`${square.x}-${square.y}-${square.id}`}
            width={width - 1}
            height={height - 1}
            x={square.x * width + 1}
            y={square.y * height + 1}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, maxOpacity, 0] }}
            transition={{
              duration,
              repeat: Infinity,
              repeatDelay,
              delay: (square.id % 16) * 0.14,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </svg>
  );
}
