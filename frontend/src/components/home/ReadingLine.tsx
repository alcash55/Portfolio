import { useEffect, useRef } from 'react';

/**
 * A 3px line under the header, filled by scroll position. CSS scroll timelines
 * drive it where they exist. This effect covers the rest and never touches the
 * transform where CSS already owns it.
 */
export function ReadingLine() {
  const fill = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = fill.current;
    if (!el) return;
    const hasTimeline = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()');
    if (hasTimeline) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="prog" aria-hidden="true">
      <i ref={fill} />
    </div>
  );
}
