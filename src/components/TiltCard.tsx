"use client";

import React, { useRef, useState, useCallback } from "react";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  glareOpacity?: number;
  glareColor?: string;
  perspective?: number;
}

export function TiltCard({
  children,
  className = "",
  maxTilt = 8,
  scale = 1.02,
  glareOpacity = 0.25,
  glareColor = "rgba(255, 255, 255, 0.4)",
  perspective = 1000,
  style = {},
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt percentages (-1 to +1)
      const percentX = (x - centerX) / centerX;
      const percentY = (y - centerY) / centerY;

      // Invert Y for standard natural 3D tilt feel
      setRotateX(-percentY * maxTilt);
      setRotateY(percentX * maxTilt);

      // Glare position in percentage
      setGlarePos({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
        opacity: glareOpacity,
      });
    },
    [maxTilt, glareOpacity]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative preserve-3d transition-transform ease-out will-change-transform ${className}`}
      style={{
        perspective: `${perspective}px`,
        transform: isHovered
          ? `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
          : `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
        transitionDuration: isHovered ? "120ms" : "500ms",
        ...style,
      }}
      {...props}
    >
      {/* Specular Glare Overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 320px at ${glarePos.x}% ${glarePos.y}%, ${glareColor}, transparent 70%)`,
          opacity: glarePos.opacity,
          mixBlendMode: "overlay",
        }}
      />
      {children}
    </div>
  );
}
