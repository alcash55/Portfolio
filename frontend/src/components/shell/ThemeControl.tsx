import { THEME_CHOICES, type ThemeChoice } from '~/lib/theme';
import { useTheme } from '~/lib/useTheme';

const LABELS: Record<ThemeChoice, string> = { light: 'Light', dark: 'Dark', system: 'System' };

/**
 * Both controls are in the markup and CSS shows one: the three-way group from
 * 1024px up, the single sun/moon button below it.
 */
export function ThemeControl() {
  const { choice, resolved, setChoice } = useTheme();
  const nextCompact = resolved === 'dark' ? 'light' : 'dark';

  return (
    <>
      <fieldset className="theme-seg">
        <legend>Theme</legend>
        {THEME_CHOICES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={choice === option}
            onClick={() => setChoice(option)}
          >
            <svg className="ck" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
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
        className="theme-btn"
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
