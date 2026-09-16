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
  // Was present tense ("Right now that means...") until issue #71: Solea's
  // end date moved from "Present" to 8/2026 in the same edit, which made this
  // read as a current role again once September rolled past that date.
  //
  // Issue #80: the closing clause ("where a wrong number cost real money and
  // the interface had to make that number obvious") had been reused across
  // cover letters and LinkedIn drafts to the point Alex didn't want to see it
  // again here. Replaced with the same claim experienceData.tsx's Solea entry
  // already makes -- "standardizing validation, error handling and fault
  // resilience across all seven markets" -- said in the bio's own voice
  // instead of a new one.
  "Hey, I'm Alex Cash, a software engineer who works the whole stack. Most recently that meant Go services and React micro-frontends for an energy trading platform, where the same validation logic had to hold across seven different markets so traders could trust the number in front of them.",
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

/**
 * Issue #80: expanded from one sentence covering two of the four things the
 * hero's photo grid shows (`Landing.tsx`'s `images` array: dogs, RMU
 * lacrosse, coaching, Joshua Tree) to cover all four, so a visitor who reads
 * the captions isn't left with the other two unexplained. Two short
 * paragraphs so the card still fits half-width beside "What Drives Me";
 * the coaching sentence is carried over near-verbatim since it was already
 * the target shape -- a personal detail that lands a point about the work,
 * not a list of hobbies.
 */
export const outsideOfWork: string[] = [
  "When I'm not coding, you'll probably find me out with my two dogs, Troy and Leon, or on a lacrosse field. I played Division I at RMU, and now I coach middle school lacrosse, which is mostly explaining the same thing four different ways until one lands. That turns out to be the job on a code review too.",
  "The rest of the time I'm probably somewhere new. Joshua Tree was the most recent stop.",
];
