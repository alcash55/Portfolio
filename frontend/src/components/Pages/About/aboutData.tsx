import type { ReactNode } from 'react';
import CodeIcon from '@mui/icons-material/Code';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

/**
 * Sprint 11 (A1): single source of truth for About's copy. The bio and the
 * "What Drives Me" list were rewritten in September 2026; the Frontend
 * Masters list below is still straight from the vault. Previously
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
  "Hey, I'm Alex Cash, a software engineer who works the whole stack. Right now that means Go services and React micro-frontends for an energy trading platform, where a wrong number costs real money and the interface has to make that number obvious.",
  'The projects I like best are the ones where I own both halves: the Storybook spec and the API behind it, the Snowflake data model and the page reading from it. React, TypeScript and Go are where I spend most of my time, with shadcn/ui, Tailwind, MUI, Vite and Bun filling in around them.',
];

export interface DrivePoint {
  text: string;
  icon: ReactNode;
}

/**
 * Rewritten in the 2026-09 unslop pass. The originals came verbatim from
 * `aboutme.MD` and were the kind of line that could sit unchanged on any
 * engineer's About page ("Always learning and refining how I work"), which
 * means they said nothing about this one.
 */
export const whatDrivesMe: DrivePoint[] = [
  { text: 'Code the next person can read without asking me about it', icon: <CodeIcon /> },
  {
    text: 'Owning a feature from the data model up to the page that reads it',
    icon: <AccountTreeIcon />,
  },
  {
    text: 'Reviews that argue about the design, not the formatting',
    icon: <GroupsIcon />,
  },
  { text: 'Measuring the thing instead of guessing at it', icon: <AutoAwesomeIcon /> },
];

export const outsideOfWork =
  "When I'm not coding, you'll probably find me coaching lacrosse or out with my two dogs. Coaching is mostly explaining the same thing four different ways until one lands, which turns out to be the job on a code review too.";

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
