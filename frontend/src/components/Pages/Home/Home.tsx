import { Stack } from '@mui/material';
import { Pages } from '../../Pages';
import { Footer } from '../../AppShell/InternalComponents/Footer';

const Home = () => {
  return (
    <Stack
      component={'article'}
      spacing={2}
      sx={{
        px: 3,
        py: 2,
        width: '100%',
        // Defence in depth, not the primary fix. The root cause of sections
        // clipping and running into each other was `section { height: ... }`
        // in global.css pinning every section to one viewport; that is now a
        // min-height. This keeps a section from being squeezed below its own
        // content should it ever exceed that minimum -- a flex item only keeps
        // its automatic minimum size while `overflow` is `visible`, and the
        // section Cards are deliberately `overflow: visible`.
        '& > *': { flexShrink: 0 },
      }}
    >
      <Pages.Landing />
      <Pages.About />
      <Pages.Experience />
      <Pages.Skills />
      <Pages.Projects />
      <Pages.Contact />
      <Footer />
    </Stack>
  );
};

export default Home;
