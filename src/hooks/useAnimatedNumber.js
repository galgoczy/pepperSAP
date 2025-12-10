import { useState, useEffect, useRef } from 'react';

/**
 * Hook for animating a number from 0 to a target value
 * @param {number} targetValue - The final value to animate to
 * @param {number} duration - Animation duration in milliseconds (default: 1000)
 * @param {boolean} enabled - Whether animation is enabled (default: true)
 */
export function useAnimatedNumber(targetValue, duration = 1000, enabled = true) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const previousValueRef = useRef(0);

  useEffect(() => {
    if (!enabled || targetValue === null || targetValue === undefined) {
      setDisplayValue(targetValue || 0);
      return;
    }

    const startValue = previousValueRef.current;
    const difference = targetValue - startValue;

    if (difference === 0) {
      setDisplayValue(targetValue);
      return;
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + difference * easeOutCubic;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        previousValueRef.current = targetValue;
        startTimeRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, enabled]);

  return displayValue;
}

/**
 * Component for displaying an animated number with formatting
 */
export function AnimatedNumber({ value, duration = 1000, formatter = (v) => Math.round(v) }) {
  const animatedValue = useAnimatedNumber(value, duration);
  return formatter(animatedValue);
}
