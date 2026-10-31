/** What the build learned about the resume PDF. */
export type ResumeInfo = { available: true; bytes: number } | { available: false };

/** Where the build writes the PDF. It is served by the static asset layer. */
export const RESUME_FILE = '/resume.pdf';

const UNAVAILABLE: ResumeInfo = { available: false };

/** Turns the build's JSON record, or its absence, into a typed value. */
export function parseResumeInfo(input: unknown): ResumeInfo {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return UNAVAILABLE;
  const record = input as Record<string, unknown>;
  const { available, bytes } = record;
  if (available === true && typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0) {
    return { available: true, bytes };
  }
  return UNAVAILABLE;
}

/** "PDF, 23 KB". One KB is 1,000 bytes, rounded to the nearest, and never below 1. */
export function resumeSizeLabel(bytes: number): string {
  return `PDF, ${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** Accessible name for a "View resume" link. The visible text comes first. */
export function resumeLinkName(info: ResumeInfo): string {
  return info.available
    ? `View resume (${resumeSizeLabel(info.bytes)}, opens in a new tab)`
    : 'View resume';
}

// The record exists after `scripts/fetch-resume.mjs` runs. A glob returns an
// empty object when the file is missing, where a plain import would fail the build.
const recorded = import.meta.glob('../generated/resume.json', {
  eager: true,
  import: 'default',
});

export const resumeInfo: ResumeInfo = parseResumeInfo(Object.values(recorded)[0]);
