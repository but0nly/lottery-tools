"use client";

import { useEffect, useState } from 'react';

interface TumblingBallProps {
  finalNumber: number;
  color: 'red' | 'blue';
  delay: number;
  isFixed?: boolean;
  max: number;
}

export function TumblingBall({ finalNumber, color, delay, isFixed, max }: TumblingBallProps) {
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // If it's a fixed number (danma), we might want it to stay static or animate briefly.
    // Let's animate all for a consistent look, but maybe fixed ones stop faster?
    // For now, let's just use the provided delay.
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= delay) {
        setDisplayNumber(finalNumber);
        setIsDone(true);
        clearInterval(interval);
      } else {
        // Generate a random number within the range for the "tumbling" effect
        let nextRandom;
        do {
          nextRandom = Math.floor(Math.random() * max) + 1;
        } while (nextRandom === displayNumber);
        setDisplayNumber(nextRandom);
      }
    }, 50); // Fast tumbling every 50ms

    return () => clearInterval(interval);
  }, [finalNumber, delay, max]);

  const baseStyles = "w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black shadow-md transition-all group-hover:scale-105";
  
  const colorStyles = color === 'red' 
    ? (isFixed ? 'bg-red-700 text-white ring-2 ring-red-200 ring-offset-2 shadow-red-100' : 'bg-red-500 text-white shadow-red-100')
    : (isFixed ? 'bg-blue-700 text-white ring-2 ring-blue-200 ring-offset-2 shadow-blue-100' : 'bg-blue-500 text-white shadow-blue-100');

  return (
    <span className={`${baseStyles} ${colorStyles}`}>
      {displayNumber !== null ? displayNumber.toString().padStart(2, '0') : '--'}
    </span>
  );
}
