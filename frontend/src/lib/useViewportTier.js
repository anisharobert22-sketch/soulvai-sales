import { useState, useEffect } from "react";

// Copied verbatim from Accura's frontend (src/lib/useViewportTier.js) -
// same device contract, same breakpoints, so the two apps' responsive
// behavior never drifts apart from each other.
const PHONE_MAX = 599;
const TABLET_MAX = 1024;

function tierFromWidth(width) {
  if (width <= PHONE_MAX) return "phone";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

export function useViewportTier() {
  const [tier, setTier] = useState(
    typeof window !== "undefined" ? tierFromWidth(window.innerWidth) : "desktop"
  );

  useEffect(() => {
    function handleResize() {
      setTier(tierFromWidth(window.innerWidth));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { tier, isPhone: tier === "phone", isTablet: tier === "tablet", isDesktop: tier === "desktop" };
}
