export interface NavLink {
  /** Section id, matches the anchor target rendered by the corresponding page section. */
  id: string;
  label: string;
}

/**
 * Single source of truth for the site's section links, shared by `NavBar` (the
 * global sticky bar) and `Landing`'s own inline nav. `useShowNavBar` hides the
 * global bar while the viewport is still on the hero, so Landing renders its
 * own nav to cover that gap -- see useShowNavBar.ts. Both components keep
 * their own presentation and show/hide behavior; only the link definitions
 * live here, so renaming or reordering a section is a one-line change instead
 * of two files that can silently drift.
 *
 * Order matches document order in Home.tsx (Landing, Experience, Skills,
 * Projects, Contact) -- `landing` is included for NavBar, which links back to
 * the top from anywhere on the page; Landing filters it out since a link to
 * the section you're already on is redundant.
 */
export const navLinks: NavLink[] = [
  { id: 'landing', label: 'Home' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills & Tech' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
];
