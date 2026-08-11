import {
  Stack,
  Card,
  CardHeader,
  IconButton,
  CardContent,
  Chip,
  Grid,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { skillCategories, type SkillItem } from './skillsData';
import TechIcon from './TechIcon';
import { useScrollReveal } from '../../../hooks/useScrollReveal';

const Skills = () => {
  const reveal = useScrollReveal();
  // The three category cards cascade rather than appearing as one block.
  const cards = useScrollReveal({ stagger: 90, distance: 18 });
  const theme = useTheme();
  // Sprint 14 (I3): was a hardcoded `rgb(18, 72, 116)` -- a fixed blue that
  // read wrong against five of the six themes (only dark/blue are blue at
  // all). Derived from `primary.main` instead so the hue follows the active
  // theme; same offset/blur/spread geometry, alpha 0.55 chosen to match the
  // original's dim, glow-not-neon weight. Experience.tsx's hover glow uses
  // the identical formula -- keep them in sync if this changes.
  const skillCardSx = {
    width: '100%',
    height: '100%',
    backgroundColor: theme.palette.background.default,
    border: `2px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: `0px 25px 20px -20px ${alpha(theme.palette.primary.main, 0.55)}`,
    },
  };
  // Shared by all four category CardContents: without flexWrap the chips
  // force each card to its unwrapped min-content width, which is what was
  // pushing cards (and their chips) outside the viewport at 320-390px.
  const skillChipsSx = { display: 'flex', flexWrap: 'wrap', gap: 1 };

  return (
    <Stack id="skills" component={'section'} ref={reveal.ref} sx={reveal.sx}>
      <Card
        sx={{
          // `overflow: visible` is load-bearing, not cosmetic. MUI's Card sets
          // `overflow: hidden`, and a flex item only gets an automatic minimum
          // size while its overflow is visible -- so as a child of Home's flex
          // column this Card could shrink below its own content and silently
          // clip the bottom. Measured: About lost 124px at 1280px and 1057px
          // at 390px, which was most of "Outside of Work". Setting height:auto
          // does NOT fix it; restoring the min-size does.
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // Deliberately NOT `height: '100%'`. As a flex child this resolved to
          // a fixed 826px while the content wanted more, and MUI's Card sets
          // `overflow: hidden` -- so the bottom of the section was silently
          // clipped (About lost 124px at 1280px and 1057px at 390px). A
          // content section must be as tall as its content.
          width: '100%',
          p: 0,
          m: 0,
        }}
      >
        <CardHeader
          sx={{
            width: '100%',
          }}
          avatar={
            <IconButton aria-label="navigate to skills & tech" href="#skills" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="Skills & Tech"
          slotProps={{
            title: {
              variant: 'h4',
              component: 'h2',
              sx: { textAlign: 'start' },
            },
          }}
        />
        <CardContent
          sx={{
            width: '100%',
            height: '100%',
            p: { xs: 2, sm: 3 },
          }}
        >
          {/* Four categories no longer fit a single row at any reasonable
              width -- a 2-up grid (1-up below `sm`) gives each card room for
              its chips to wrap instead of being squeezed to min-content,
              which is what broke at 320-390px before Sprint 9's fix. */}
          <Grid container spacing={3} ref={cards.ref} sx={cards.sx}>
            {skillCategories.map((category) => (
              <Grid key={category.label} size={{ xs: 12, sm: 6 }}>
                <Card sx={skillCardSx}>
                  <CardHeader
                    title={category.label}
                    slotProps={{
                      title: { component: 'h3', variant: 'h6' },
                    }}
                  />
                  <CardContent sx={skillChipsSx}>
                    {category.items.map((item) => (
                      <SkillChip key={item.label} item={item} />
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
};

/**
 * `icon` is rendered inside `label` (rather than via Chip's own `icon`
 * prop) so `TechIcon`'s sizing wrapper isn't fighting Chip's
 * `cloneElement`-based icon slot.
 *
 * Three cases:
 * - **wordmark** -- the SVG already spells the product name (Go, Node.js,
 *   Express, Next.js, Git), so printing the text beside it says the name
 *   twice. The mark renders alone and `TechIcon`'s `label` carries the name
 *   for assistive tech, which would otherwise get nothing at all.
 * - **glyph** -- a symbol with no lettering, so it needs the text label; the
 *   icon stays `aria-hidden` since the label already reads as text.
 * - **no icon** -- plain text.
 */
const SkillChip = ({ item }: { item: SkillItem }) => {
  if (item.icon && item.wordmark) {
    return (
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TechIcon icon={item.icon} size={16} label={item.label} />
          </Box>
        }
      />
    );
  }

  return (
    <Chip
      label={
        item.icon ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <TechIcon icon={item.icon} size={16} />
            {item.label}
          </Box>
        ) : (
          item.label
        )
      }
    />
  );
};

export default Skills;
