'use client';

import { useEffect } from 'react';

/**
 * Lets the landing page's `data-reveal` blocks rise in as they scroll into view
 * (animations.css). Only blocks below the fold are hidden first, so nothing on screen blinks,
 * and the page reads fine before this runs or without JavaScript. Skipped with reduced motion,
 * and under automation (navigator.webdriver) so tests and screenshots see the whole page.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      navigator.webdriver
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          delete (entry.target as HTMLElement).dataset.armed;
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );
    for (const block of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
      if (block.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
      block.dataset.armed = '';
      observer.observe(block);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
