import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import Typescript from '../../../assets/icons/Typescript';
import Go from '../../../assets/icons/Go';
import Javascript from '../../../assets/icons/Javascript';
import ReactIcon from '../../../assets/icons/React';
import Node from '../../../assets/icons/Node';
import Bun from '../../../assets/icons/Bun';
import Express from '../../../assets/icons/Express';
import Next from '../../../assets/icons/Next';
import Docker from '../../../assets/icons/Docker';
import Git from '../../../assets/icons/Git';
import Github from '../../../assets/icons/Github';
import Vite from '../../../assets/icons/Vite';
import Mui from '../../../assets/icons/Mui';
import Tailwind from '../../../assets/icons/Tailwind';
import ShadcnUi from '../../../assets/icons/ShadcnUi';
import Supabase from '../../../assets/icons/Supabase';
import Snowflake from '../../../assets/icons/Snowflake';
import Couchbase from '../../../assets/icons/Couchbase';
import Postgresql from '../../../assets/icons/Postgresql';
import Grafana from '../../../assets/icons/Grafana';
import RestApi from '../../../assets/icons/RestApi';
import GithubActions from '../../../assets/icons/GithubActions';
import Sql from '../../../assets/icons/Sql';
import Html5 from '../../../assets/icons/Html5';
import Css from '../../../assets/icons/Css';
import Figma from '../../../assets/icons/Figma';
import Vitest from '../../../assets/icons/Vitest';
import GoogleCloud from '../../../assets/icons/GoogleCloud';
import Cloudflare from '../../../assets/icons/Cloudflare';
import Vercel from '../../../assets/icons/Vercel';
import Linux from '../../../assets/icons/Linux';
import FullStory from '../../../assets/icons/FullStory';
import PostHog from '../../../assets/icons/PostHog';

export interface SkillItem {
  label: string;
  /** Omitted for the items aboutme.MD names that have no icon component built. */
  icon?: ComponentType<SvgIconProps>;
  /**
   * True when the icon is a *logotype* -- it already spells the product name
   * (Go, Node.js, Express, Next.js, Git all ship wide wordmark SVGs, viewBox
   * aspect ratios 2.4-5.0 versus ~1.0 for the square glyphs). Rendering the
   * text label beside one of those prints the name twice, so the chip shows
   * the mark alone and moves the name onto its accessible label instead.
   */
  wordmark?: boolean;
}

export interface SkillCategory {
  label: string;
  items: SkillItem[];
}

/**
 * Sprint 11 (A3): reconciles the original three categories (Languages,
 * Frameworks, Tools -- all plain-text chips, 11 items) with the richer
 * tech snapshot from `aboutme.MD`, and gives Data & Analytics (then called
 * "Databases") and DevOps/CI/CD a category of their own rather than
 * overloading "Tools".
 *
 * Sprint 14 (I2): built the seven icons that were still missing (Vite, MUI,
 * shadcn/UI, Tailwind CSS, Supabase, Couchbase, PostgreSQL) and wired them
 * in here. None are wordmarks -- every one is an abstract glyph (bolt,
 * wave, elephant, crossed bars...) that doesn't spell the product name, so
 * `wordmark` is left unset on all seven and the chip renders icon + text
 * label, same as Bun/React/Docker/GitHub. Single-SPA and CI/CD still have no
 * icon component built; out of scope here.
 *
 * Grafana joins DevOps & CI/CD (it's observability tooling, not a database or
 * a framework) with its own icon -- an abstract flame glyph, so no `wordmark`.
 * GitHub Actions and SQL picked up icons at the same time: Actions' brand
 * workflow-graph mark, and for SQL -- which has no vendor and so no brand
 * mark -- the generic database-cylinder glyph in `currentColor`. REST API is
 * the third of that kind: an assembled `{ HTTP }` mark, and the only one that
 * spells something, so it is the one flagged `wordmark`.
 *
 * 2026-08-19: eight more, all from the resume and absent here until now --
 * HTML and CSS (Languages), Vitest and Figma (Frameworks & Tools), and the
 * cloud/hosting set plus Linux (DevOps & CI/CD, which is where hosting lives
 * rather than in a fifth category -- the 2-up grid would strand a lone
 * half-width card). Vercel and Linux take `currentColor` instead of their
 * brand colours; see the note in each icon for the contrast measurement that
 * forced it.
 */
export const skillCategories: SkillCategory[] = [
  {
    label: 'Languages',
    items: [
      { label: 'TypeScript', icon: Typescript },
      { label: 'Go', icon: Go, wordmark: true },
      { label: 'JavaScript', icon: Javascript },
      { label: 'HTML', icon: Html5 },
      { label: 'CSS', icon: Css },
      { label: 'SQL', icon: Sql },
    ],
  },
  {
    label: 'Frameworks & Tools',
    items: [
      { label: 'React', icon: ReactIcon },
      { label: 'Node.js', icon: Node, wordmark: true },
      { label: 'Bun', icon: Bun },
      { label: 'Express', icon: Express, wordmark: true },
      { label: 'Next.js', icon: Next, wordmark: true },
      { label: 'Single-SPA' },
      { label: 'MUI', icon: Mui },
      { label: 'Tailwind CSS', icon: Tailwind },
      { label: 'Vite', icon: Vite },
      { label: 'shadcn/UI', icon: ShadcnUi },
      { label: 'Vitest', icon: Vitest },
      { label: 'Figma', icon: Figma },
      // 2026-09-01: added because four of the fourteen postings in the vault's
      // Job Search 2026 note ask for AI-assisted development by name, and Alex
      // works in Claude Code daily. No icon built for it, same as Single-SPA
      // and CI/CD below, rather than inventing a brand mark.
      { label: 'Claude Code' },
    ],
  },
  {
    // Was "Databases". FullStory is product analytics -- session replay and
    // behavioural data -- which is neither a database nor delivery tooling, so
    // it fitted neither this category nor DevOps & CI/CD, where it first
    // landed. Widening the category is the smaller change than adding a fifth
    // one: the 2-up grid would strand an odd card at half width, and Snowflake
    // already sits here as analytics infrastructure rather than an app's
    // database. Looker and Google Tag Manager belong here too when they land.
    label: 'Data & Analytics',
    items: [
      { label: 'Supabase', icon: Supabase },
      { label: 'Snowflake', icon: Snowflake },
      { label: 'Couchbase', icon: Couchbase },
      { label: 'PostgreSQL', icon: Postgresql },
      // Its logotype spells the name, so `wordmark` -- same treatment as Go,
      // Node.js, Express, Next.js and git.
      { label: 'FullStory', icon: FullStory, wordmark: true },
      // A symbol rather than a logotype, so no `wordmark` -- the chip prints
      // the name beside the mark. Product analytics on this site itself; see
      // `analytics.ts`.
      { label: 'PostHog', icon: PostHog },
    ],
  },
  {
    label: 'DevOps & CI/CD',
    items: [
      { label: 'Docker', icon: Docker },
      { label: 'Git', icon: Git, wordmark: true },
      { label: 'GitHub', icon: Github },
      { label: 'GitHub Actions', icon: GithubActions },
      { label: 'Grafana', icon: Grafana },
      { label: 'Google Cloud', icon: GoogleCloud },
      { label: 'Cloudflare', icon: Cloudflare },
      { label: 'Vercel', icon: Vercel },
      { label: 'Linux', icon: Linux },
      // Rendered as the `{ HTTP }` mark alone -- hence `wordmark`, which
      // moves the "REST API" text onto the icon's accessible label instead of
      // printing it beside a glyph that already spells something. The text
      // chip read badly here: Oxygen draws a capital I as a bare vertical
      // stroke, so the original "REST APIs" came out looking like "APls".
      { label: 'REST API', icon: RestApi, wordmark: true },
      { label: 'CI/CD' },
    ],
  },
];
