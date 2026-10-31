// Strings for the Experience, Education and Contact sections. Each group names
// the copy deck rows it comes from. Where the deck and the approved comp
// disagree, the comp wins and the difference is listed in the port notes.

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

export interface ExperienceSpec {
  readonly id: 'experience' | 'ncr-voyix' | 'ncr-store-health';
  /** Position in the chapters index. */
  readonly n: 8 | 9 | 10;
  readonly title: string;
  readonly overline: string;
  readonly heading: string;
  readonly role: string;
  readonly lead: string;
  readonly reverse: boolean;
  readonly writeUp?: ExperienceWriteUp;
  /** EX-23g. Shown beside the write-up link when the code belongs to a past employer. */
  readonly note?: string;
  /** The bullets behind Read more. */
  readonly more: readonly string[];
  readonly stack: string;
  readonly fig: FigSpec;
}

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
      n: 7,
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
    more: [
      'Built a publishing pipeline from GitHub to Strapi. Product teams kept their Markdown in their own repositories.',
      'Restructured and expanded the Commerce Design Docs that product teams build against.',
      'Extended the static analysis composite GitHub Actions that gate every merge on the Voyix Doc Site.',
      'Added PR checks for spelling, Markdown validity and image alt text. The review comment updates as new commits arrive.',
      'Passed content through remark into Strapi, and rendered selected HTML as React design-system components.',
      'Built four analytics pipelines for accessibility, GTM, Qualtrics and FullStory, feeding BigQuery and Looker.',
    ],
    stack: 'Next.js, Strapi, remark, GitHub Actions, BigQuery, Looker',
    fig: {
      n: 8,
      label: 'Pipeline',
      caption: 'Docs pipeline, simplified',
      meta: '4/2023 to 6/2024',
    },
  },
  {
    id: 'ncr-store-health',
    n: 10,
    title: 'NCR Store Health',
    overline: 'NCR · 7/2021 to 4/2023',
    heading: 'Store Health for Starbucks UK',
    role: 'UI Engineer I',
    lead: 'Interviewed Starbucks UK users, mapped personas and journeys in FigJam and iterated designs in Figma. Then built the React dashboard that rolls store health up to country level on live API data, used in management presentations.',
    reverse: true,
    writeUp: { slug: 'starbucks-store-health', label: 'Read the write-up' },
    note: 'The code belongs to NCR.',
    more: [
      'Partnered with the Digital Connected Services team on the design of the API behind the dashboard.',
      'Built React components for the NCR Design System with its designers.',
      "Scored accessibility in CI and posted each build's result to PRs and Slack.",
      'Instrumented digital connected services with Google Tag Manager and FullStory.',
      'Interned as a Software Engineer from 7/2020 to 9/2020, working on a REST API on Google Cloud Platform.',
    ],
    stack: 'React, MUI, Figma, FigJam, Design Systems, Accessibility, Google Tag Manager',
    fig: {
      n: 9,
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

// EX-24, EX-25 and the comp's carousel.
export const EDUCATION = {
  id: 'education',
  n: 11,
  title: 'Education',
  overline: 'Education and coaching',
  heading: 'Degrees in software, then coaching lacrosse',
  lines: [
    'M.S. Web and Mobile Information Systems and B.S. Software Engineering, Robert Morris University, 5/2021.',
    'Lacrosse coach, varsity and middle school, Lakota West, 1/2022 to 1/2025.',
  ],
  fig: { n: 10, label: 'Photos' },
  carouselLabel: 'Education and coaching photos',
  photos: [
    {
      src: '/media/west_ms_coaching.webp',
      width: 515,
      height: 424,
      alt: 'Alex coaching middle school lacrosse at Lakota West.',
      caption: 'Coaching middle school lacrosse at Lakota West.',
    },
    {
      src: '/media/rmu_lacrosse.webp',
      width: 533,
      height: 424,
      alt: 'Alex playing lacrosse for Robert Morris.',
      caption: 'Playing lacrosse at Robert Morris.',
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

export const LINKEDIN_URL = 'https://www.linkedin.com/in/alexander-cash/';
export const GITHUB_URL = 'https://github.com/alcash55';

// The comp's "Say hi." band. COPY.md MA-01 says "Get in touch." The comp wins.
export const CONTACT_BAND = {
  id: 'contact',
  n: 12,
  title: 'Say hi',
  overline: 'Contact',
  heading: 'Say hi.',
  line: "Let's work together. Send me a message here.",
} as const;

// CT-01 to CT-16, the `/contact` page.
export const CONTACT_PAGE = {
  h1: 'Get in touch.',
  intro: "Let's work together. Email is the most direct way to reach me.",
  cta: 'Message Alex',
  ctaName: 'Message Alex (goes to the contact form)',
  formHeading: 'Send a message',
  formIntro: 'The form needs the API, which can take a minute to wake. Email works either way.',
  preferEmail: 'Prefer email?',
  email: CONTACT_EMAIL,
  title: 'Contact, Alex Cash',
  description: 'Email Alex Cash, view his resume, or send a message.',
} as const;

// The /resume page when no PDF was fetched at build time.
export const RESUME_PAGE = {
  title: 'Resume, Alex Cash',
  description: 'The resume file is not available right now. Email Alex Cash for a copy.',
  h1: 'The resume is not available right now.',
  line: 'The file did not load when this site was built. Email me and I will send it.',
  emailLabel: 'Email Alex',
  homeLink: 'Go to the home page',
} as const;
