import { Box, AppBar, Toolbar, Button, IconButton, useMediaQuery } from '@mui/material';
import Menu from '@mui/icons-material/Menu';
import { useShowNavBar } from './useShowNavBar';
import { navLinks } from './navLinks';
import { Logo } from '../../../assets/icons/Logo';

interface NavBarProps {
  setSettingDrawer: (value: boolean) => void;
}

export const NavBar = ({ setSettingDrawer }: NavBarProps) => {
  const isVisible = useShowNavBar();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // 220ms in / 160ms out. This was a 1000ms `Fade`, which made the bar feel
  // late even once `useShowNavBar` fired at the right moment -- a full second
  // of fade means it is still nearly transparent a third of a second after the
  // hero's arrow has gone. Chrome, not content: it should keep up with the
  // scroll, not perform.
  const enterMs = prefersReducedMotion ? 0 : 220;
  const exitMs = prefersReducedMotion ? 0 : 160;
  const duration = isVisible ? enterMs : exitMs;

  return (
    <Box
      sx={{
        flexGrow: 1,
        top: 0,
        position: 'sticky',
        // `position: sticky` always creates a stacking context, so the
        // AppBar's own z-index is scoped inside this Box and cannot lift it
        // above page content. At zIndex 1 the bar tied with MUI's input
        // labels (also z-index 1) and lost on DOM order, letting the Name and
        // Email labels show through. Match the theme's appBar layer instead.
        zIndex: (theme) => theme.zIndex.appBar,
        width: '100%',
        opacity: isVisible ? 1 : 0,
        // Slides down from a hair above its resting place. `none` rather than
        // `translateY(0)` when settled, so the bar stops being a containing
        // block for anything inside it once the transition is over.
        transform: isVisible || prefersReducedMotion ? 'none' : 'translateY(-10px)',
        // `visibility` is what actually removes the hidden bar from the
        // accessibility tree and the tab order -- opacity alone would leave a
        // full row of invisible, focusable nav buttons over the hero. It has to
        // switch instantly on the way in but wait for the fade on the way out,
        // hence the delayed 0s step rather than a duration.
        visibility: isVisible ? 'visible' : 'hidden',
        transition: [
          `opacity ${duration}ms ease`,
          `transform ${duration}ms ease`,
          `visibility 0s linear ${isVisible ? 0 : duration}ms`,
        ].join(', '),
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <AppBar sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          {/* Icon-only, so the accessible name lives on the IconButton -- Logo
                itself stays decorative (no titleAccess) to avoid a duplicate
                announcement, matching the pattern SidebarNav's collapsed rail
                already uses for its own icon-only nav links. */}
          <IconButton
            aria-label="Alex Cash — go to top"
            href="#landing"
            sx={{ color: 'text.primary', mr: 1 }}
          >
            <Logo sx={{ fontSize: 28 }} />
          </IconButton>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-evenly',
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
            {navLinks.map((link) => (
              <Button
                key={link.id}
                variant="text"
                sx={{ color: 'text.primary' }}
                href={`#${link.id}`}
              >
                {link.label}
              </Button>
            ))}
          </Box>
          <IconButton aria-label="Open Settings Drawer" onClick={() => setSettingDrawer(true)}>
            <Menu sx={{ color: 'text.primary' }} />
          </IconButton>
        </Toolbar>
      </AppBar>
    </Box>
  );
};
