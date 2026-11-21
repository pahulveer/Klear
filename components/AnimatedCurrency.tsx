"use client";

import React, { useEffect, useState, useRef } from "react";

interface AnimatedCurrencyProps {
  value: number;
  prefix?: string;
  className?: string;
  decimals?: number;
  showSign?: boolean;
}

export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  prefix = "₹",
  className = "",
  decimals = 0,
  showSign = false,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const targetVal = Number.isFinite(value) ? value : 0;
    prevValueRef.current = targetVal;

    // If starting and ending are effectively identical, no need to animate
    if (Math.abs(startVal - targetVal) < 0.001) {
      setDisplayValue(targetVal);
      return;
    }

    const duration = 280; // ~280ms ease-out
    const startTime = performance.now();

    const updateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out: fast start, settling smoothly
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetVal - startVal) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateFrame);
      } else {
        setDisplayValue(targetVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value]);

  const absVal = Math.abs(displayValue);
  const formattedNumber = absVal.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = showSign && displayValue > 0 ? "+" : displayValue < 0 ? "-" : "";

  return (
    <span
      className={`tabular-nums font-mono ${className}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {sign}
      {prefix}
      {formattedNumber}
    </span>
  );
};
