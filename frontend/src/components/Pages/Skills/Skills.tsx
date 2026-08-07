import { Stack, Card, CardHeader, IconButton, CardContent, Chip, useTheme } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

const Skills = () => {
  const theme = useTheme();
  const skills = {
    Languages: ['TypeScript', 'JavaScript', 'Go'],
    Frameworks: ['React', 'Node.js', 'Bun', 'Express', 'Next.js'],
    Tools: ['Docker', 'Git', 'GitHub'],
  };
  const skillCardSx = {
    width: '100%',
    height: { xs: 'auto', sm: '25%' },
    backgroundColor: theme.palette.background.default,
    border: `2px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: ' 0px 25px 20px -20px rgb(18, 72, 116)',
    },
  };
  // Shared by all three category CardContents: without flexWrap the chips
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
              textAlign: 'start',
              variant: 'h4',
              component: 'h2',
            },
          }}
        />
        <CardContent
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            // Three cards side by side is what forced each one down to its
            // unwrapped min-content width (chips one word per line, ~28px)
            // at 320-390px. Stacking below `sm` gives each card the full
            // section width instead.
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-evenly',
            alignItems: 'center',
            flexGrow: 1,
            gap: 3,
          }}
        >
          <Card sx={skillCardSx}>
            <CardHeader
              title="Languages"
              slotProps={{
                title: { component: 'h3' },
              }}
            />
            <CardContent sx={skillChipsSx}>
              {skills.Languages.map((language) => (
                <Chip key={language} label={language} />
              ))}
            </CardContent>
          </Card>
          <Card sx={skillCardSx}>
            <CardHeader
              title="Frameworks"
              slotProps={{
                title: { component: 'h3' },
              }}
            />
            <CardContent sx={skillChipsSx}>
              {skills.Frameworks.map((framework) => (
                <Chip key={framework} label={framework} />
              ))}
            </CardContent>
          </Card>
          <Card sx={skillCardSx}>
            <CardHeader
              title="Tools"
              slotProps={{
                title: { component: 'h3' },
              }}
            />
            <CardContent sx={skillChipsSx}>
              {skills.Tools.map((tool) => (
                <Chip key={tool} label={tool} />
              ))}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Skills;
