import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window to top whenever the route pathname changes.
 * Skips when the URL has a hash (anchor scroll handled elsewhere).
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
