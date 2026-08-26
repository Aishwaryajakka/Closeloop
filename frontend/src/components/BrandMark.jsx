import React from "react";

// CloseLoop mark: an incomplete resolution ring (the open request) closing into a check (resolution).
export function BrandMark({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M25.6 9.4A11 11 0 1 0 27 16"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M11 16.4l3.5 3.5L23.2 11"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default BrandMark;
