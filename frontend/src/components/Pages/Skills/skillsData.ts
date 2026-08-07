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
      { label: 'Go', icon: Go },
      { label: 'JavaScript', icon: Javascript },
      { label: 'SQL' },
    ],
  },
  {
    label: 'Frameworks & Tools',
    items: [
      { label: 'React', icon: ReactIcon },
      { label: 'Node.js', icon: Node },
      { label: 'Bun', icon: Bun },
      { label: 'Express', icon: Express },
      { label: 'Next.js', icon: Next },
      { label: 'Single-SPA' },
      { label: 'MUI' },
      { label: 'Tailwind CSS' },
      { label: 'Vite' },
    ],
  },
  {
    label: 'Databases',
    items: [{ label: 'Couchbase' }, { label: 'PostgreSQL' }],
  },
  {
    label: 'DevOps & CI/CD',
    items: [
      { label: 'Docker', icon: Docker },
      { label: 'Git', icon: Git },
      { label: 'GitHub', icon: Github },
      { label: 'GitHub Actions' },
      { label: 'REST APIs' },
      { label: 'CI/CD' },
    ],
  },
];
