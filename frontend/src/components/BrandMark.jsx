import React from "react";

// CloseLoop brand mark: an open loop (the request) closing with a check (resolution).
export function BrandMark({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M19.5 12a7.5 7.5 0 1 1-3.6-6.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8.5 12.3l2.6 2.6L16 9.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default BrandMark;
