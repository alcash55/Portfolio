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
 * category of their own rather than overloading "Tools". Every one of the
 * 11 previously-unmounted icon components in `assets/icons/**` is used
 * here. The additional MD items (SQL, Single-SPA, MUI, Tailwind CSS,
 * Vite, Couchbase, PostgreSQL, GitHub Actions, REST APIs, CI/CD) have no
 * icon component built, so they render as plain-text chips -- building
 * new icons for them is out of scope for this sprint.
 */
export const skillCategories: SkillCategory[] = [
  {
    label: 'Languages',
    items: [
      { label: 'TypeScript', icon: Typescript },
      { label: 'Go', icon: Go, wordmark: true },
      { label: 'JavaScript', icon: Javascript },
      { label: 'SQL' },
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
      { label: 'MUI' },
      { label: 'Tailwind CSS' },
      { label: 'Vite' },
      { label: 'shadcn/UI' },
    ],
  },
  {
    label: 'Databases',
    items: [{ label: 'Supabase' }, { label: 'Couchbase' }, { label: 'PostgreSQL' }],
  },
  {
    label: 'DevOps & CI/CD',
    items: [
      { label: 'Docker', icon: Docker },
      { label: 'Git', icon: Git, wordmark: true },
      { label: 'GitHub', icon: Github },
      { label: 'GitHub Actions' },
      { label: 'REST APIs' },
      { label: 'CI/CD' },
    ],
  },
];
