import { useCallback, useEffect, useRef, useState } from 'react';
import type { StaticProject } from './staticProjects';
import { projectFromHash, projectHash, projectSlug, SECTION_HASH } from './projectSlug';

export interface ProjectDialogState {
  /** The project whose dialog is open, or `null` for closed. */
  project: StaticProject | null;
  open: (project: StaticProject) => void;
  close: () => void;
}

/**
 * Which project dialog is open, kept in the URL fragment so a dialog is
 * shareable: `#projects/portfolio-website` opens that card's dialog on a cold
 * load, and `hashchange` (the back button, or someone editing the address bar)
 * opens or closes it after that.
 *
 * Three details that are easy to get wrong here:
 *
 * - **`#projects` on its own still has to work.** It is the section anchor the
 *   header's link icon uses. `projectFromHash` returns `null` for it, so it
 *   opens nothing and the browser scrolls to the section as it always did.
 * - **Opening pushes, closing replaces.** Pushing on open makes the browser's
 *   back button close the dialog, which is what a full-screen dialog on a
 *   phone is expected to do. Replacing on close means clicking the X does not
 *   add a second entry, so back does not walk through a history of dialogs
 *   nobody wants to revisit.
 * - **`pushState`/`replaceState` do not fire `hashchange`.** That is what
 *   keeps the listener from fighting our own writes; state is set directly
 *   alongside each one.
 */
export const useProjectDialog = (): ProjectDialogState => {
  const [project, setProject] = useState<StaticProject | null>(() =>
    projectFromHash(window.location.hash),
  );
  // The card to hand focus back to when the dialog closes. Held as a slug
  // rather than an element because the dialog can be opened with no
  // originating card at all -- a cold load on a shared link -- and "the card
  // for this project" is still the right place to land in that case.
  const lastOpenedSlug = useRef<string | null>(null);
  if (project) lastOpenedSlug.current = projectSlug(project);

  useEffect(() => {
    const onHashChange = () => setProject(projectFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    // A cold load on `#projects/<slug>` leaves the page scrolled to the top,
    // because no element has that id for the browser to jump to. Put the
    // section behind the dialog so closing it lands the visitor on the cards
    // rather than back at the hero.
    if (!projectFromHash(window.location.hash)) return;
    // `scrollIntoView` is not implemented in jsdom, and this is a nicety, not
    // behaviour worth crashing a test run over.
    document.getElementById('projects')?.scrollIntoView?.({ block: 'start' });
  }, []);

  useEffect(() => {
    if (project || !lastOpenedSlug.current) return;
    const slug = lastOpenedSlug.current;
    lastOpenedSlug.current = null;
    // Focus goes back to the card that opened the dialog. MUI would restore it
    // to "whatever was focused before", which is `<body>` for a dialog opened
    // from a link -- hence `disableRestoreFocus` on the Dialog and this
    // instead. Looked up by slug, since the card may never have been touched.
    document
      .querySelector<HTMLElement>(`[data-project-slug="${slug}"]`)
      ?.focus({ preventScroll: false });
  }, [project]);

  const open = useCallback((next: StaticProject) => {
    window.history.pushState(null, '', projectHash(next));
    setProject(next);
  }, []);

  const close = useCallback(() => {
    window.history.replaceState(null, '', SECTION_HASH);
    setProject(null);
  }, []);

  return { project, open, close };
};

export default useProjectDialog;
