import { THEME_CHOICES, type ThemeChoice } from '~/lib/theme';
import { useTheme } from '~/lib/useTheme';

// Both controls are in the markup and exactly one shows: the three-way group from 1024px, the
// single sun/moon button below it.
const GROUP =
  'hidden gap-[2px] rounded-full border-[1.5px] border-line-strong p-[3px] min-[1024px]:inline-flex';

// The pressed option is filled with the ink color and shows a check, so the state is not color alone.
// In forced-colors mode the system highlight replaces the fill.
const OPTION = [
  'group inline-flex min-h-11 min-w-[44px] cursor-pointer items-center gap-[6px] rounded-full px-[14px]',
  'text-[0.875rem] leading-none font-medium',
  'transition-[background-color] duration-(--duration-color) ease-(--ease-color)',
  'not-aria-pressed:hover:bg-fill aria-pressed:bg-ink aria-pressed:text-paper',
  'forced-colors:aria-pressed:bg-[color:Highlight] forced-colors:aria-pressed:text-[color:HighlightText]',
  'forced-colors:aria-pressed:[forced-color-adjust:none]',
].join(' ');
const CHECK = 'hidden group-aria-pressed:block';

const SINGLE_BUTTON = [
  'inline-grid size-11 cursor-pointer place-items-center rounded-[50%]',
  'border-[1.5px] border-line-strong hover:bg-fill min-[1024px]:hidden',
].join(' ');

const LABELS: Record<ThemeChoice, string> = { light: 'Light', dark: 'Dark', system: 'System' };

/** The theme choice: a three-way group on wide screens, one sun/moon button on narrow ones. */
export function ThemeControl() {
  const { choice, resolved, setChoice } = useTheme();
  const nextCompact = resolved === 'dark' ? 'light' : 'dark';

  return (
    <>
      <fieldset className={GROUP}>
        <legend className="sr">Theme</legend>
        {THEME_CHOICES.map((option) => (
          <button
            key={option}
            type="button"
            className={OPTION}
            aria-pressed={choice === option}
            onClick={() => setChoice(option)}
          >
            <svg className={CHECK} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2.5 7.4l3 3L11.5 3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {LABELS[option]}
          </button>
        ))}
      </fieldset>
      <button
        type="button"
        className={SINGLE_BUTTON}
        aria-label={`Switch to ${nextCompact} theme`}
        onClick={() => setChoice(nextCompact)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="10" cy="10" r="3.6" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" />
        </svg>
      </button>
    </>
  );
}
