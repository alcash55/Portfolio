import { SvgIcon, SvgIconProps } from '@mui/material';

/**
 * PostHog's hedgehog mark, from simple-icons.
 *
 * `fill="currentColor"`, not the brand hex, and deliberately so: simple-icons
 * records PostHog's canonical colour as `#000000` (their brand assets page is
 * the source). A literal black mark is invisible on the five dark themes --
 * the same reason `FullStory` is drawn in `currentColor` rather than its own
 * black. Stating the fill is required either way: MUI merges a single nested
 * `<svg>` child onto its own root, where an inherited fill falls back to
 * black.
 *
 * Not flagged `wordmark` in `skillsData` -- this is a symbol rather than a
 * logotype, so it carries no lettering and the chip still needs to print
 * "PostHog" beside it.
 */
const PostHog = (props: SvgIconProps) => {
  const svg = (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.854 14.5 5 9.647.854 5.5A.5.5 0 0 0 0 5.854V8.44a.5.5 0 0 0 .146.353L5 13.647l.147.146L9.854 18.5l.146.147v-.049c.065.03.134.049.207.049h2.586a.5.5 0 0 0 .353-.854L9.854 14.5zm0-5-4-4a.487.487 0 0 0-.409-.144.515.515 0 0 0-.356.21.493.493 0 0 0-.089.288V8.44a.5.5 0 0 0 .147.353l9 9a.5.5 0 0 0 .853-.354v-2.585a.5.5 0 0 0-.146-.354l-5-5zm1-4a.5.5 0 0 0-.854.354V8.44a.5.5 0 0 0 .147.353l4 4a.5.5 0 0 0 .853-.354V9.854a.5.5 0 0 0-.146-.354l-4-4zm12.647 11.515a3.863 3.863 0 0 1-2.232-1.1l-4.708-4.707a.5.5 0 0 0-.854.354v6.585a.5.5 0 0 0 .5.5H23.5a.5.5 0 0 0 .5-.5v-.6c0-.276-.225-.497-.499-.532zm-5.394.032a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zM.854 15.5a.5.5 0 0 0-.854.354v2.293a.5.5 0 0 0 .5.5h2.293c.222 0 .39-.135.462-.309a.493.493 0 0 0-.109-.545L.854 15.501zM5 14.647.854 10.5a.5.5 0 0 0-.854.353v2.586a.5.5 0 0 0 .146.353L4.854 18.5l.146.147h2.793a.5.5 0 0 0 .353-.854L5 14.647z" />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default PostHog;
