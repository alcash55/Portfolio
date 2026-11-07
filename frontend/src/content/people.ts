// Strings for the Experience, Education and Contact sections. Ids like EX-24
// and MA-01 tag where each string came from. Where the written copy and the
// approved design disagreed, the design won.

export const CONTACT_EMAIL = 'alex.e.cash28@gmail.com';

export interface FigSpec {
  readonly n: number;
  readonly label: string;
  readonly caption: string;
  readonly meta: string;
}

export interface ExperienceWriteUp {
  /** A slug under /experience. */
  readonly slug: 'ncr-voyix-docs' | 'starbucks-store-health';
  readonly label: string;
}

interface ExperienceBase {
  readonly id: 'experience' | 'ncr-voyix' | 'ncr-store-health';
  /** Position in the chapters index. */
  readonly n: 8 | 9 | 10;
  readonly title: string;
  readonly overline: string;
  readonly heading: string;
  readonly role: string;
  readonly lead: string;
  readonly reverse: boolean;
  readonly fig: FigSpec;
}

/**
 * A role with a write-up keeps its detail there, so the home chapter stops at the lead and the
 * link. A role with none shows its highlights and stack in the chapter, since nowhere else has them.
 */
export type ExperienceSpec = ExperienceBase &
  (
    | {
        readonly writeUp: ExperienceWriteUp;
        /** EX-23g. Shown beside the write-up link when the code belongs to a past employer. */
        readonly note?: string;
      }
    | {
        readonly writeUp?: undefined;
        readonly more: readonly string[];
        readonly stack: string;
      }
  );

// EX-02 to EX-23g.
export const EXPERIENCE: readonly ExperienceSpec[] = [
  {
    id: 'experience',
    n: 8,
    title: 'Solea Energy',
    overline: 'Solea Energy · 8/2024 to 9/2026',
    heading: 'Trade submissions for seven markets',
    role: 'Software Engineer',
    lead: 'Helped migrate the legacy Python submit and withdraw endpoints for seven ISO markets onto a shared Go library.',
    reverse: true,
    more: [
      'Built the Portfolio Credit Analysis micro-frontend and its Go API from a Storybook spec, including ISO-specific bid-curve calculations.',
      'Delivered the FTR mapping feature end to end, from mockups to Snowflake data model, retiring a recurring manual support burden.',
      'Helped migrate the trading platform onto a Kubernetes-native function-as-a-service system running Go and Python plugins.',
      'Built features across the catalog API and React UI of an internal developer portal, backed by a sync ETL pulling GitHub metadata into Snowflake.',
      'Migrated core Beyond UI components from PrimeReact and PrimeFlex to shadcn/ui, and built solea.energy from an empty repository with SSR pre-rendering.',
      'Supported 25+ traders, turning their requests into fixes and features, and led rollout of the v3 Excel-based submission tool.',
    ],
    stack: 'Go, TypeScript, React, Tailwind CSS, Snowflake, Grafana',
    fig: {
      n: 8,
      label: 'Architecture',
      caption: 'Seven ISO markets, simplified',
      meta: '8/2024 to 9/2026',
    },
  },
  {
    id: 'ncr-voyix',
    n: 9,
    title: 'NCR Voyix',
    overline: 'NCR Voyix · 4/2023 to 6/2024',
    heading: 'Rebuilding the Voyix docs site',
    role: 'Software Engineer II',
    lead: 'Rebuilt the Voyix documentation site in Next.js, with navigation for 2,300+ pages across 23 products.',
    reverse: false,
    writeUp: { slug: 'ncr-voyix-docs', label: 'Read the write-up' },
    note: 'The code belongs to NCR.',
    fig: {
      n: 9,
      label: 'Pipeline',
      caption: 'Docs pipeline, simplified',
      meta: '4/2023 to 6/2024',
    },
  },
  {
    id: 'ncr-store-health',
    n: 10,
    title: 'NCR',
    overline: 'NCR · 7/2021 to 4/2023',
    heading: 'Store Health for Starbucks UK',
    role: 'UI Engineer I',
    lead: 'Interviewed Starbucks UK users, mapped personas and journeys in FigJam and iterated designs in Figma. Then built the React dashboard that rolls store health up to country level on live API data, used in management presentations.',
    reverse: true,
    writeUp: { slug: 'starbucks-store-health', label: 'Read the write-up' },
    note: 'The code belongs to NCR.',
    fig: {
      n: 10,
      label: 'Workflow',
      caption: 'Store Health, simplified',
      meta: '7/2021 to 4/2023',
    },
  },
];

export interface Photo {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption: string;
}

// EX-24 and EX-25, with the photo carousel.
export const EDUCATION = {
  id: 'education',
  n: 11,
  title: 'Education',
  overline: 'Education and coaching',
  heading: 'Division I lacrosse, software degrees, then coaching',
  lines: [
    'Played all five years of Division I lacrosse at Robert Morris University.',
    'M.S. Web and Mobile Information Systems and B.S. Software Engineering, Robert Morris University, 5/2021.',
    'Lacrosse coach, varsity and middle school, Lakota West, 1/2022 to 1/2025.',
  ],
  fig: { n: 11, label: 'Photos' },
  carouselLabel: 'Education and coaching photos',
  photos: [
    {
      src: '/media/lakota_west_sideline.webp',
      width: 1000,
      height: 769,
      alt: 'Alex coaching on the Lakota West sideline with the Firebirds lacrosse team.',
      caption: 'Coaching lacrosse at Lakota West.',
    },
    {
      src: '/media/rmu_lacrosse.webp',
      width: 533,
      height: 424,
      alt: 'Alex playing lacrosse for Robert Morris.',
      caption: 'Playing lacrosse at Robert Morris.',
    },
    {
      src: '/media/rmu_28.webp',
      width: 719,
      height: 820,
      alt: 'Alex in his number 28 Robert Morris jersey, holding a lacrosse stick on the field.',
      caption: 'Number 28 at Robert Morris.',
    },
    {
      src: '/media/rmuLogo.webp',
      width: 300,
      height: 143,
      alt: 'Robert Morris University logo.',
      caption: 'Robert Morris University, where I earned both degrees.',
    },
  ],
} as const satisfies {
  id: string;
  n: number;
  title: string;
  overline: string;
  heading: string;
  lines: readonly string[];
  fig: { n: number; label: string };
  carouselLabel: string;
  photos: readonly Photo[];
};

export interface Certificate {
  readonly slug: string;
  readonly title: string;
  readonly teacher: string;
  /** Course length in minutes, so the total below cannot drift from the rows. */
  readonly minutes: number;
  /** ISO date, shown as written on the certificate. */
  readonly completed: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

const CERT_IMAGE = { width: 1400, height: 991 } as const;

/** Master.dev certificates of completion, newest first. The images are the certificates as issued. */
export const CERTIFICATES: readonly Certificate[] = [
  {
    slug: 'basics-of-go',
    title: 'Basics of Go',
    teacher: 'Maximiliano Firtman',
    minutes: 7 * 60 + 57,
    completed: '2026-11-03',
    src: '/images/certificates/basics-of-go.webp',
    ...CERT_IMAGE,
  },
  {
    slug: 'full-stack-fundamentals-v3',
    title: 'Full Stack Fundamentals, v3',
    teacher: 'Jem Young',
    minutes: 8 * 60 + 12,
    completed: '2026-10-19',
    src: '/images/certificates/full-stack-fundamentals-v3.webp',
    ...CERT_IMAGE,
  },
  {
    slug: 'claude-code',
    title: 'Claude Code',
    teacher: 'Lydia Hallie',
    minutes: 60 + 56,
    completed: '2026-10-06',
    src: '/images/certificates/claude-code.webp',
    ...CERT_IMAGE,
  },
  {
    slug: 'vite',
    title: 'Vite',
    teacher: 'Steve Kinney',
    minutes: 4 * 60 + 10,
    completed: '2026-10-03',
    src: '/images/certificates/vite.webp',
    ...CERT_IMAGE,
  },
];

export const CERTIFICATES_CHAPTER = {
  id: 'certificates',
  n: 12,
  title: 'Certificates',
  overline: 'Certificates',
  heading: 'Four Master.dev courses finished since October',
  fig: { n: 12, label: 'Certificates' },
  carouselLabel: 'Master.dev certificates',
} as const;

/** "7 hr 57 min", "1 hr 56 min". */
export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

/** "Nov 3, 2026", from an ISO date. Parsed as UTC so the day never shifts with the visitor's zone. */
export function formatCompleted(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const LINKEDIN_URL = 'https://www.linkedin.com/in/alexander-cash/';
export const GITHUB_URL = 'https://github.com/alcash55';

// The home page band says "Say hi." and the /contact h1 says "Get in touch."
// The two differ on purpose.
export const CONTACT_BAND = {
  id: 'contact',
  n: 13,
  title: 'Say hi',
  overline: 'Contact',
  heading: 'Say hi.',
  line: 'Send me a message here.',
} as const;

// The /resume page when the API could not supply the PDF.
export const RESUME_PAGE = {
  title: 'Resume, Alex Cash',
  description: 'The resume file is not available right now. Email Alex Cash for a copy.',
  h1: 'The resume is not available right now.',
  line: 'The file did not load. Try again in a minute, or email me and I will send it.',
  emailLabel: 'Email Alex',
  homeLink: 'Go to the home page',
} as const;
