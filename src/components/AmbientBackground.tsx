"use client";

import React, { useEffect, useState } from "react";

export function AmbientBackground() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to percentage
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Interactive mouse cursor ambient spotlight */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-25 transition-transform duration-700 ease-out"
        style={{
          background: "radial-gradient(circle, rgba(255, 69, 0, 0.45) 0%, rgba(139, 92, 246, 0.25) 50%, transparent 70%)",
          left: `${mousePos.x}%`,
          top: `${mousePos.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Persistent floating ambient neon orbs */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#FF4500]/15 rounded-full blur-[120px] animate-float" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-[#8B5CF6]/15 rounded-full blur-[160px] animate-float-reverse" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#00F2FF]/10 rounded-full blur-[130px] animate-pulse-glow" />

      {/* Cyberpunk dot-matrix grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}
