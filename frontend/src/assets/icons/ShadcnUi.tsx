import { SvgIcon, SvgIconProps } from '@mui/material';

// shadcn/ui's mark is genuinely monochrome -- two crossed diagonal bars,
// rendered black on their light-mode site and white on dark. `currentColor`
// is the correct (and only) treatment so it inverts with each of the six
// themes' text colour instead of going invisible against one of them.
const ShadcnUi = (props: SvgIconProps) => {
  const svg = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>shadcn/ui Logo</title>
      <path
        fill="currentColor"
        d="M22.219 11.784 11.784 22.219c-.407.407-.407 1.068 0 1.476.407.407 1.068.407 1.476 0L23.695 13.26c.407-.408.407-1.069 0-1.476-.408-.407-1.069-.407-1.476 0ZM20.132.305.305 20.132c-.407.407-.407 1.068 0 1.476.408.407 1.069.407 1.476 0L21.608 1.781c.407-.407.407-1.068 0-1.476-.408-.407-1.069-.407-1.476 0Z"
      />
    </svg>
  );

  return <SvgIcon {...props}>{svg}</SvgIcon>;
};

export default ShadcnUi;
