import { useEffect, useRef } from 'react';

const LINE = 'pointer-events-none absolute inset-x-0 -bottom-px h-[3px] print:hidden';
// Where scroll timelines exist, the fill runs on the page's scroll progress (the prog keyframes
// in styles.css) and the effect below stays out of the way. The effect writes an inline
// transform, which would multiply with Tailwind's scale property, so the starting state is a
// transform too.
const FILL = [
  'block h-full origin-[0_50%] bg-accent [transform:scaleX(0)]',
  'supports-[animation-timeline:scroll()]:animate-prog',
  'supports-[animation-timeline:scroll()]:[animation-timeline:scroll(root)]',
].join(' ');

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
    <div className={LINE} aria-hidden="true" data-reading-line>
      <i ref={fill} className={FILL} />
    </div>
  );
}
