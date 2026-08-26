import React from "react";

// CloseLoop mark: two interlocking circular arrows — the loop that always closes.
export function BrandMark({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Left loop */}
      <path d="M19.4 11.6A8 8 0 1 0 19.4 20.4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      {/* Left arrowhead (top opening, pointing up) */}
      <path d="M15.9 12.1 19.4 11.6 20 8.1" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Right loop */}
      <path d="M12.6 20.4A8 8 0 1 0 12.6 11.6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      {/* Right arrowhead (bottom opening, pointing down) */}
      <path d="M16.1 19.9 12.6 20.4 12 23.9" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default BrandMark;
