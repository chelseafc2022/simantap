"use client"

import React from "react"

interface MiniDonutProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  showText?: boolean
  label?: string
  className?: string
}

export function MiniDonut({
  value = 0,
  size = 36,
  strokeWidth = 3.5,
  color,
  trackColor,
  showText = true,
  label,
  className = "",
}: MiniDonutProps) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const radius = (40 - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (safeValue / 100) * circumference

  // Warna default dinamis jika tidak ditentukan
  const resolvedColor =
    color ||
    (safeValue >= 100
      ? "#059669" // emerald-600
      : safeValue >= 50
      ? "#2563eb" // blue-600
      : safeValue > 0
      ? "#0ea5e9" // sky-500
      : "#94a3b8") // slate-400

  const resolvedTrackColor = trackColor || "currentColor"

  const tooltipText = label
    ? `${label}: ${safeValue.toFixed(1)}%`
    : `${safeValue.toFixed(1)}%`

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={tooltipText}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className="-rotate-90 transform"
      >
        {/* Track circle (latar belakang ring) */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={resolvedTrackColor}
          strokeWidth={strokeWidth}
          className="text-muted/30 dark:text-muted/20"
        />
        {/* Progress circle (nilai realisasi) */}
        {safeValue > 0 && (
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      {showText && (
        <span
          className="absolute inset-0 flex items-center justify-center font-mono font-bold select-none"
          style={{
            fontSize: size <= 32 ? "8px" : size <= 40 ? "9px" : "11px",
            color: safeValue > 0 ? "inherit" : "#94a3b8",
          }}
        >
          {Math.round(safeValue)}%
        </span>
      )}
    </div>
  )
}

