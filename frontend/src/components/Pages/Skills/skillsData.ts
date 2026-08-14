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
import GithubActions from '../../../assets/icons/GithubActions';
import Sql from '../../../assets/icons/Sql';

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
 * tech snapshot from `aboutme.MD`, and gives Databases and DevOps/CI/CD a
 * category of their own rather than overloading "Tools".
 *
 * Sprint 14 (I2): built the seven icons that were still missing (Vite, MUI,
 * shadcn/UI, Tailwind CSS, Supabase, Couchbase, PostgreSQL) and wired them
 * in here. None are wordmarks -- every one is an abstract glyph (bolt,
 * wave, elephant, crossed bars...) that doesn't spell the product name, so
 * `wordmark` is left unset on all seven and the chip renders icon + text
 * label, same as Bun/React/Docker/GitHub. Single-SPA, REST APIs and CI/CD
 * still have no icon component built; out of scope here.
 *
 * Grafana joins DevOps & CI/CD (it's observability tooling, not a database or
 * a framework) with its own icon -- an abstract flame glyph, so no `wordmark`.
 * GitHub Actions and SQL picked up icons at the same time: Actions' brand
 * workflow-graph mark, and for SQL -- which has no vendor and so no brand
 * mark -- the generic database-cylinder glyph in `currentColor`.
 */
export const skillCategories: SkillCategory[] = [
  {
    label: 'Languages',
    items: [
      { label: 'TypeScript', icon: Typescript },
      { label: 'Go', icon: Go, wordmark: true },
      { label: 'JavaScript', icon: Javascript },
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
    ],
  },
  {
    label: 'Databases',
    items: [
      { label: 'Supabase', icon: Supabase },
      { label: 'Snowflake', icon: Snowflake },
      { label: 'Couchbase', icon: Couchbase },
      { label: 'PostgreSQL', icon: Postgresql },
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
      { label: 'REST APIs' },
      { label: 'CI/CD' },
    ],
  },
];
