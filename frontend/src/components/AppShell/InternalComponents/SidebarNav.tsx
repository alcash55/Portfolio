import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  Divider,
  Stack,
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { navLinks } from './navLinks';
import { Logo } from '../../../assets/icons/Logo';

/** localStorage key for the collapsed state, following the same pattern as the
 * `layout` key `AppShellProvider` uses to persist the layout mode. */
const COLLAPSE_STORAGE_KEY = 'sideNavCollapsed';
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

interface SideBarTopItemProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SideBarTopItem = ({ collapsed, onToggle }: SideBarTopItemProps) => {
  return (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          justifyContent: collapsed ? 'center' : 'space-between',
          alignItems: 'center',
          gap: 1,
          py: collapsed ? 2 : undefined,
        }}
      >
        {collapsed ? (
          // Collapsed 72px rail: the mark alone. Decorative like the expanded
          // brand text it stands in for below -- no titleAccess, so it stays
          // aria-hidden; SideBarItems' own buttons carry the accessible names
          // for this rail.
          <Logo sx={{ fontSize: 28, color: 'text.primary' }} />
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {/* Decorative next to the adjacent "Alex Cash" text -- no
                titleAccess, so the name is announced once, not twice. */}
            <Logo sx={{ fontSize: 24, color: 'text.primary' }} />
            {/* This is persistent shell chrome (a brand label repeated in every layout
                mode), not the page's title, so it's rendered as a plain div rather than
                an h1 or demoted heading — Landing's hero h1 ("Alex Cash") is the page's
                one real title; a second element with the same text would be a duplicate
                heading, not a subordinate one. */}
            <Typography
              variant={'h1'}
              component={'div'}
              sx={{
                fontSize: 24,
                color: 'text.primary',
                // The rail is a fixed 240px and this sits beside the logo and
                // the collapse toggle, so "Alex Cash" had just enough room to
                // break onto a second line and push the row's height around.
                whiteSpace: 'nowrap',
              }}
            >
              Alex Cash
            </Typography>
          </Stack>
        )}
        <Tooltip title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          <IconButton
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            onClick={onToggle}
            sx={{ color: 'text.primary' }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Tooltip>
      </Toolbar>
      <Divider />
    </>
  );
};

interface SideBarItemsProps {
  collapsed: boolean;
}

const SideBarItems = ({ collapsed }: SideBarItemsProps) => {
  return (
    <Stack
      spacing={2}
      sx={{
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        py: 2,
      }}
    >
      {navLinks.map((link) => {
        const Icon = link.icon;
        const href = `#${link.id}`;

        // Collapsed rail: icon-only buttons. An icon with no visible label still
        // needs an accessible name (WCAG 4.1.2 / Lighthouse `button-name`), so
        // `aria-label` carries the name and `Tooltip` surfaces it visually on
        // hover/focus for sighted mouse and keyboard users.
        if (collapsed) {
          return (
            <Tooltip title={link.label} placement="right" key={link.id}>
              <IconButton
                aria-label={link.label}
                href={href}
                sx={{
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Icon />
              </IconButton>
            </Tooltip>
          );
        }

        return (
          <Button
            variant="contained"
            startIcon={<Icon />}
            href={href}
            key={link.id}
            sx={{
              minWidth: 150,
              display: 'flex',
              justifyContent: 'space-evenly',
            }}
          >
            {link.label}
          </Button>
        );
      })}
    </Stack>
  );
};

/**
 * The sideNav layout's fixed left-hand nav column only — deliberately does not wrap
 * `children`. `AppShellLayout` renders this as a sibling of the page content so that
 * content's position in the tree (and therefore its React state) is unaffected by
 * this nav column mounting or unmounting when the layout mode changes, or by this
 * component's own collapse/expand state changing.
 */
export const SidebarNav = () => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true',
  );

  const toggleCollapsed = () => {
    setCollapsed((prevCollapsed) => {
      const nextCollapsed = !prevCollapsed;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(nextCollapsed));
      return nextCollapsed;
    });
  };

  return (
    <Box
      component="nav"
      sx={{
        position: 'sticky',
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        flexShrink: 0,
        height: '100%',
        px: 1,
        py: 2,
        top: 0,
        transition: (theme) => theme.transitions.create('width'),
      }}
    >
      <SideBarTopItem collapsed={collapsed} onToggle={toggleCollapsed} />
      <SideBarItems collapsed={collapsed} />
    </Box>
  );
};
