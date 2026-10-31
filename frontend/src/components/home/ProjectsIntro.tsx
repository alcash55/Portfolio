import { PROJECTS_INTRO } from '~/content/home';

/** Opens the Projects group. It is a landing spot for #projects, not a numbered chapter. */
export function ProjectsIntro() {
  return (
    <section className="projects-intro" id={PROJECTS_INTRO.id} aria-labelledby="projects-h">
      <h2 id="projects-h" tabIndex={-1}>
        {PROJECTS_INTRO.heading}
      </h2>
      <p>{PROJECTS_INTRO.line}</p>
    </section>
  );
}
