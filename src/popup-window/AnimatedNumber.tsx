import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  durationSeconds?: number;
}

// Smoothly rolls the displayed integer toward `value` (a count-up/down effect).
export default function AnimatedNumber({ value, durationSeconds = 0.2 }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: durationSeconds, ease: "easeOut" });
    return () => controls.stop();
  }, [value, durationSeconds, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}
