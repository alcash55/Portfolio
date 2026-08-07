import { Button, Stack } from '@mui/material';
import { ThemeName, useColorMode } from '../../../layout/Theme/ColorModeContext';

// Every option here must stay clickable, not just localStorage-reachable:
// the red toggle sat commented out for over a year before Sprint 4.5
// restored it, so this is the only place a theme is switched from.
const THEME_OPTIONS: { name: ThemeName; label: string }[] = [
  { name: 'dark', label: 'Dark' },
  { name: 'blue', label: 'Blue' },
  { name: 'light', label: 'Light' },
];

export const ThemeButton = () => {
  const { toggleColorMode, themeName } = useColorMode();

  return (
    <Stack
      direction={'row'}
      sx={{
        justifyContent: 'space-evenly',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {THEME_OPTIONS.map(({ name, label }) => (
        <Button
          key={name}
          variant={themeName === name ? 'contained' : 'outlined'}
          // The button's own text is its accessible name; aria-pressed adds
          // the selected state on top, so this reads as a toggle group
          // rather than three unrelated actions.
          aria-pressed={themeName === name}
          onClick={() => toggleColorMode(name)}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
};
