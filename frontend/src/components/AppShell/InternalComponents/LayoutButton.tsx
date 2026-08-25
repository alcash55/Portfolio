import { Stack, Button } from '@mui/material';
import { useAppShellLayout } from '../AppShellLayoutContext';

// `layout` comes from AppShellLayoutContext, the same source HeroControls reads
// for its own layout controls -- not `localStorage.getItem('layout')`. That used
// to be a render-time read of external mutable state, which is wrong even where
// it happens to look right: this shell's own clicks always re-render this whole
// subtree anyway, so it read a freshly-written value back out by coincidence.
// The read stops being harmless the moment anything writes the key without
// going through this AppShellProvider's own state -- another tab (localStorage
// is shared same-origin, but React state is not), or `AppShellProvider`'s
// `applyMode`, which forces `mode` to 'mobile' below 650px but can still be
// asked to persist a non-mobile `newLayout` to localStorage, so the stored
// value and the shell's actual layout are two different things. Neither of
// those writes triggers a re-render of this component on its own, so the next
// unrelated one (a scroll, a resize) would have picked up a value this tab
// never actually switched to. `AppShellLayoutContext.layout` is always the
// shell's real, current mode; localStorage is only ever a persistence
// mechanism now, written by `applyMode` and never read back out for UI state.
export const LayoutButton = () => {
  const { layout, toggleLayout } = useAppShellLayout();

  return (
    <Stack
      direction={'row'}
      sx={{
        justifyContent: 'space-evenly',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Button
        variant={layout === 'default' ? 'contained' : 'outlined'}
        aria-pressed={layout === 'default'}
        onClick={() => toggleLayout('default')}
      >
        Top Nav
      </Button>
      <Button
        variant={layout === 'sideNav' ? 'contained' : 'outlined'}
        aria-pressed={layout === 'sideNav'}
        onClick={() => toggleLayout('sideNav')}
      >
        Side Nav
      </Button>
    </Stack>
  );
};
