import type { ReactNode } from 'react';
import CodeIcon from '@mui/icons-material/Code';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

/**
 * Sprint 11 (A1): single source of truth for About's copy. Previously
 * `About.tsx` rendered its own hardcoded copy while `aboutme.MD` sat next to
 * it, unimported, with a slightly richer version of the same content --
 * two sources of truth, one of them invisible. This module is lifted
 * (reconciled, not just copy-pasted) from the MD, which Alex confirmed is
 * "accurate enough" -- `aboutme.MD` is deleted so this is the only copy
 * left. Follows the `staticProjects.ts` / `experienceData.tsx` convention
 * of a typed data module beside the component, rather than adding a
 * markdown-rendering pipeline for a single page.
 */

export const bioParagraphs: string[] = [
  "Hey, I'm Alex Cash — a Software Engineer who enjoys building clean, scalable, and well-designed systems. I'm passionate about creating software that not only works great under the hood but also delivers a smooth, intuitive experience for users.",
  'I work across the stack, but my favorite projects are the ones that blend front-end precision with backend performance. I love working with React, TypeScript, and Go, and I lean on tools like MUI, Tailwind, Vite, and Bun.js to move fast and keep things maintainable.',
];

export interface DrivePoint {
  text: string;
  icon: ReactNode;
}

/** Matches aboutme.MD's "What Drives Me" list verbatim; icons are new (A2). */
export const whatDrivesMe: DrivePoint[] = [
  { text: "Writing code that's simple, clear, and reliable", icon: <CodeIcon /> },
  {
    text: 'Building systems that scale without sacrificing readability',
    icon: <AccountTreeIcon />,
  },
  {
    text: 'Collaborating with teams who care about craft and efficiency',
    icon: <GroupsIcon />,
  },
  { text: 'Always learning and refining how I work', icon: <AutoAwesomeIcon /> },
];

export const outsideOfWork =
  "When I'm not coding, you'll probably find me coaching lacrosse or spending time with my two dogs. Coaching has taught me a lot about communication, patience, and leadership — lessons that carry directly into how I approach software development and teamwork.";

/**
 * From Alex's Obsidian vault (`Learning/Frontend Masters (Master.dev)/`),
 * cleared for use by the Sprint 11 brief: 7 completed courses, verbatim
 * titles. Nothing here is inferred -- no dates, providers, or credentials
 * beyond what the brief listed.
 */
export const continuousLearning = {
  provider: 'Frontend Masters',
  courses: [
    'API Design in Node',
    'Basics of Go',
    'Complete Intro to Containers',
    'Fullstack for Frontend',
    'Interviewing for Frontend Engineers',
    'Intro to Databases',
    'Web Authentication APIs',
  ],
};
