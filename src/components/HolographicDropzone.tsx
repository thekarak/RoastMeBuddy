"use client";

import React, { useRef, useState, useCallback } from "react";

interface HolographicDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function HolographicDropzone({
  file,
  onFileSelect,
  disabled = false,
}: HolographicDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        const ext = droppedFile.name.toLowerCase().split(".").pop();
        if (ext === "pdf" || ext === "docx") {
          onFileSelect(droppedFile);
        }
      }
    },
    [disabled, onFileSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileSelect(selected);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      onClick={() => !disabled && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative cursor-pointer rounded-2xl p-8 transition-all duration-300 overflow-hidden group ${
        isDragOver
          ? "border-2 border-[#FF4500] bg-[#FF4500]/10 shadow-[0_0_50px_rgba(255,69,0,0.35)] scale-[1.01]"
          : file
          ? "border border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_35px_rgba(16,185,129,0.2)]"
          : "border border-white/10 hover:border-white/25 bg-[#0E0E17]/60 hover:bg-[#131320]/70"
      } backdrop-blur-xl`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Holographic Laser Scanner */}
      <div className="laser-scanner" />

      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      {file ? (
        /* Selected File Card */
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl glass border border-emerald-500/30">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <span className="text-2xl">📄</span>
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Ready to Roast
                </span>
                <span className="text-xs font-mono text-[#71717A]">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate max-w-[280px] sm:max-w-md mt-1">
                {file.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearFile}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
            >
              ✕ Remove
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone State */
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF4500]/20 to-[#8B5CF6]/20 border border-white/15 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,69,0,0.4)] transition-all duration-300">
            <span className="text-3xl animate-bounce">⚡</span>
          </div>

          <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-lg font-bold text-white mb-1">
            Drop your CV / Resume here
          </h3>
          <p className="text-sm text-[#9CA3AF] max-w-sm mb-4">
            Drag & drop your file or <span className="text-[#FF8C00] font-semibold underline underline-offset-2">browse computer</span>
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[#71717A]">
              PDF (.pdf)
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[#71717A]">
              Word (.docx)
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <span>🔒</span> Private & Secure
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
