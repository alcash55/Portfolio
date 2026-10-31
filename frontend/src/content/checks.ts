/** The nine actions in the ac-composite-actions repo, as the checks figure lists them. */
export interface CheckRow {
  readonly name: string;
  readonly does: string;
}

export const CHECK_ROWS: readonly CheckRow[] = [
  { name: 'diff', does: 'Lists the files changed in the pull request' },
  { name: 'security/betterleaks', does: "Scans the pull request's commits for secrets" },
  { name: 'markdown-checks/spellcheck', does: 'Spellchecks the changed markdown' },
  { name: 'accessibility/axe-check', does: 'Runs the WCAG 2 A and AA rules' },
  { name: 'ats-check', does: 'Scores a resume PDF for ATS compatibility' },
  { name: 'format-message', does: 'Formats the result into a comment body' },
  { name: 'notifications/pr-comment', does: 'Keeps one current comment per check' },
  { name: 'notifications', does: 'Posts a PR comment or a Discord message' },
  { name: 'notifications/discord-messages', does: 'Sends a message to a Discord channel' },
];
