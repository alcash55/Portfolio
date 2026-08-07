import {
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import SchoolIcon from '@mui/icons-material/School';
import SportsHandballIcon from '@mui/icons-material/SportsHandball';
import PetsIcon from '@mui/icons-material/Pets';
import resumePdf from '../../../assets/AlexResume.pdf';
import Logo from '../../../assets/icons/Logo';
import ReactIcon from '../../../assets/icons/React';
import Typescript from '../../../assets/icons/Typescript';
import Go from '../../../assets/icons/Go';
import TechIcon from '../Skills/TechIcon';
import { bioParagraphs, whatDrivesMe, outsideOfWork, continuousLearning } from './aboutData';

const About = () => {
  const theme = useTheme();
  // Shared by every sub-panel below so the section reads as a set of
  // layered cards (the hero's idiom) rather than one continuous text
  // column -- matches Skills' skillCardSx: same border/bg treatment, no
  // translucent overlays sitting behind body text (that's produced wrong
  // contrast readings twice on this project per the sprint brief).
  const panelSx = {
    height: '100%',
    backgroundColor: theme.palette.background.default,
    border: `2px solid ${theme.palette.divider}`,
  };

  return (
    <Stack id="about" component={'section'}>
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
            <IconButton aria-label="navigate to about" href="#about" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="About Me"
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
            p: { xs: 2, md: 4 },
          }}
        >
          <Grid container spacing={3}>
            {/* Identity panel: the visual anchor this section was missing --
                monogram, name/role, the bio's own named "core stack", and
                the resume link, all in one card so the rest of the grid can
                stay text-first. */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ ...panelSx, position: 'relative', overflow: 'hidden' }}>
                <Box
                  aria-hidden
                  sx={{
                    height: 6,
                    width: '100%',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                />
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 2,
                    py: 4,
                  }}
                >
                  <Logo aria-hidden sx={{ fontSize: 88, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
                      Alex Cash
                    </Typography>
                    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                      Software Engineer
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      component="p"
                      sx={{
                        color: 'text.secondary',
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      Core Stack
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: 'center', justifyContent: 'center' }}
                    >
                      <TechIcon icon={ReactIcon} size={26} label="React" />
                      <TechIcon icon={Typescript} size={26} label="TypeScript" />
                      <TechIcon icon={Go} size={26} label="Go" />
                    </Stack>
                  </Box>
                  <Button
                    href={resumePdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    startIcon={<DescriptionOutlined />}
                    aria-label="View Resume (opens Alex Cash's resume PDF in a new tab)"
                    // primary.light, not the outlined-button default of primary.main:
                    // primary.main only clears WCAG AA body-text contrast (4.5:1)
                    // against paper in the dark and red themes; in blue it measures
                    // 3.98:1. primary.light clears AA in all three.
                    sx={{ mt: 1, color: 'primary.light', borderColor: 'primary.light' }}
                  >
                    View Resume
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Bio */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={panelSx}>
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    height: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {bioParagraphs.map((paragraph) => (
                    <Typography key={paragraph} variant="body1">
                      {paragraph}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* What Drives Me */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card sx={panelSx}>
                <CardHeader
                  title="What Drives Me"
                  slotProps={{ title: { component: 'h3', variant: 'h6' } }}
                />
                <CardContent>
                  <Grid container spacing={2}>
                    {whatDrivesMe.map((point) => (
                      <Grid key={point.text} size={{ xs: 12 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                          <Box
                            aria-hidden
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              flexShrink: 0,
                              borderRadius: '50%',
                              bgcolor: 'action.hover',
                              color: 'primary.main',
                              '& svg': { fontSize: 18 },
                            }}
                          >
                            {point.icon}
                          </Box>
                          <Typography variant="body2" sx={{ pt: 0.5 }}>
                            {point.text}
                          </Typography>
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Continuous Learning -- Frontend Masters courses, from the vault */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card sx={panelSx}>
                <CardHeader
                  avatar={<SchoolIcon aria-hidden sx={{ color: 'primary.main' }} />}
                  title="Continuous Learning"
                  subheader={`${continuousLearning.courses.length} ${continuousLearning.provider} courses completed`}
                  slotProps={{ title: { component: 'h3', variant: 'h6' } }}
                />
                <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {continuousLearning.courses.map((course) => (
                    <Chip key={course} label={course} size="small" variant="outlined" />
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Outside of Work */}
            <Grid size={{ xs: 12 }}>
              <Card sx={panelSx}>
                <CardHeader
                  title="Outside of Work"
                  slotProps={{ title: { component: 'h3', variant: 'h6' } }}
                />
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <SportsHandballIcon
                      aria-hidden
                      sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
                    />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {outsideOfWork}
                    </Typography>
                    <PetsIcon
                      aria-hidden
                      sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default About;
