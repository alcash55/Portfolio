// HD-05 to HD-08 and FT-02: the same four destinations, in journey order.
export const NAV_ITEMS = [
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]['id'];

/** Project and experience pages belong to their section, so that nav link reads as current. */
export function sectionForPath(pathname: string): NavId | null {
  if (pathname.startsWith('/projects/')) return 'projects';
  if (pathname.startsWith('/experience/')) return 'experience';
  return null;
}
