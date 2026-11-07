import { buildCheckRows, countWord, type CheckRow, type RepoAction } from '~/lib/ciActions';

export type { CheckRow };

/**
 * What each action does, in the order the figure lists them. The list of actions itself
 * comes from the repo through GET /api/v1/ci-actions, so an action that is not named here
 * still appears, with the first sentence of its own description.
 */
const WRITTEN: Readonly<Record<string, string>> = {
  diff: 'Lists the files changed in the pull request',
  'security/betterleaks': "Scans the pull request's commits for secrets",
  'security/betterleaks/comment': 'Verifies the scan report and updates the finding comment',
  'markdown-checks/spellcheck': 'Spellchecks the changed markdown',
  'accessibility/axe-check': 'Runs the WCAG 2 A and AA rules',
  'ats-check': 'Scores a resume PDF for ATS compatibility',
  'format-message': 'Formats the result into a comment body',
  'notifications/pr-comment': 'Keeps one current comment per check',
  notifications: 'Posts a PR comment or a Discord message',
  'notifications/discord-messages': 'Sends a message to a Discord channel',
};

// What the server renders, and what stays when the API is slow or down. It is the list as
// of the last edit here, so the counts in running text below come from it too.
export const CHECK_ROWS: readonly CheckRow[] = Object.entries(WRITTEN).map(([name, does]) => ({
  name,
  does,
}));

/** The rows for the actions the API listed, or the fallback rows when it listed none. */
export function checkRowsFrom(actions: readonly RepoAction[] | null): readonly CheckRow[] {
  return buildCheckRows(actions, WRITTEN, CHECK_ROWS);
}

export const ACTION_COUNT = CHECK_ROWS.length;

/** "nine" or "ten", for running text. */
export const ACTION_COUNT_WORD = countWord(ACTION_COUNT);
