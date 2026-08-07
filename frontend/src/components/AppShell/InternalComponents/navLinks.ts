import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import Home from '@mui/icons-material/Home';
import EmojiPeople from '@mui/icons-material/EmojiPeople';
import Work from '@mui/icons-material/Work';
import Construction from '@mui/icons-material/Construction';
import Code from '@mui/icons-material/Code';
import ConnectWithoutContact from '@mui/icons-material/ConnectWithoutContact';

export interface NavLink {
  /** Section id, matches the anchor target rendered by the corresponding page section. */
  id: string;
  label: string;
  /**
   * Icon component (not a rendered element) so this file can stay a plain `.ts` module
   * without JSX -- consumers that want an icon render it themselves via `<link.icon />`.
   * `NavBar` and Landing's inline nav ignore it; `SidebarNav` and `MobileChrome` use it so
   * they can derive their icon lists from here instead of maintaining their own.
   */
  icon: ComponentType<SvgIconProps>;
}

/**
 * Single source of truth for the site's section links, shared by `NavBar` (the
 * global sticky bar), `SidebarNav`, `MobileChrome`, and Landing's own inline nav.
 * `useShowNavBar` hides the global bar while the viewport is still on the hero, so
 * Landing renders its own nav to cover that gap -- see useShowNavBar.ts. Each
 * consumer keeps its own presentation and show/hide behavior; only the link
 * definitions live here, so renaming, reordering, or adding a section is a
 * one-line change instead of four files that can silently drift (see git history:
 * `about` was wired into `Home` but never added here, so it went missing from
 * every nav for four sprints).
 *
 * Order matches document order in Home.tsx (Landing, About, Experience, Skills,
 * Projects, Contact) -- `landing` is included for NavBar, which links back to
 * the top from anywhere on the page; Landing filters it out since a link to
 * the section you're already on is redundant.
 */
export const navLinks: NavLink[] = [
  { id: 'landing', label: 'Home', icon: Home },
  { id: 'about', label: 'About', icon: EmojiPeople },
  { id: 'experience', label: 'Experience', icon: Work },
  { id: 'skills', label: 'Skills & Tech', icon: Construction },
  { id: 'projects', label: 'Projects', icon: Code },
  { id: 'contact', label: 'Contact', icon: ConnectWithoutContact },
];
