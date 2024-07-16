import { useState, useEffect } from "react";

/**
 * Hook to show/hide the nav bar based on scroll position
 * @returns {boolean} true if the nav bar is visible, false otherwise
 */
export const showNavBar = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      // Adjust this threshold based on your layout and design
      if (scrollPosition > 695) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Listen to scroll events
    window.addEventListener("scroll", handleScroll);

    // Clean up the listener when the component unmounts
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return isVisible;
};
