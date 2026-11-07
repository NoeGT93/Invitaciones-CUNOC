import { useEffect } from 'react';

/**
 * Fade-up sutil para elementos con [data-reveal] al entrar en pantalla.
 * Sin IntersectionObserver o con movimiento reducido, todo queda visible.
 */
export function useReveal() {
  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducido || !('IntersectionObserver' in window)) return;
    const root = document.documentElement;
    root.classList.add('reveal-on');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
