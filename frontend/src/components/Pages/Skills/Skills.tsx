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
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { skillCategories, type SkillItem } from './skillsData';
import TechIcon from './TechIcon';

const Skills = () => {
  const theme = useTheme();
  const skillCardSx = {
    width: '100%',
    height: '100%',
    backgroundColor: theme.palette.background.default,
    border: `2px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: ' 0px 25px 20px -20px rgb(18, 72, 116)',
    },
  };
  // Shared by all four category CardContents: without flexWrap the chips
  // force each card to its unwrapped min-content width, which is what was
  // pushing cards (and their chips) outside the viewport at 320-390px.
  const skillChipsSx = { display: 'flex', flexWrap: 'wrap', gap: 1 };

  return (
    <Stack id="skills" component={'section'}>
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
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
          <Grid container spacing={3}>
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
 * `cloneElement`-based icon slot -- the label already reads as text to
 * assistive tech, so the icon itself stays `aria-hidden` (see TechIcon).
 */
const SkillChip = ({ item }: { item: SkillItem }) => (
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

export default Skills;
