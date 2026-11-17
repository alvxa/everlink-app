"use client";

import * as React from "react";

const STARS = [
  { left: "11%", top: "16%", size: 2, delay: "0s" },
  { left: "24%", top: "64%", size: 3, delay: "1.4s" },
  { left: "37%", top: "27%", size: 2, delay: "2.6s" },
  { left: "51%", top: "76%", size: 3, delay: "0.8s" },
  { left: "63%", top: "21%", size: 2, delay: "3.1s" },
  { left: "76%", top: "49%", size: 3, delay: "1.9s" },
  { left: "85%", top: "14%", size: 2, delay: "0.4s" },
  { left: "92%", top: "67%", size: 2, delay: "2.2s" },
];

export function AmbientField() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      if (!last) return;
      node.style.setProperty("--pointer-x", `${last.clientX}px`);
      node.style.setProperty("--pointer-y", `${last.clientY}px`);
      node.dataset.pointer = "on";
    };
    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="ambient-field" aria-hidden>
      <span className="aurora aurora-1" />
      <span className="aurora aurora-2" />
      <span className="aurora aurora-3" />
      <span className="pointer-glow" />
      {STARS.map((star, index) => (
        <span
          key={index}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
}
