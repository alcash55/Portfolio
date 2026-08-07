import {
  Box,
  Stack,
  Card,
  CardHeader,
  IconButton,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { experienceData } from './experienceData';

const Experience = () => {
  const theme = useTheme();

  return (
    <Stack id="experience" component={'section'} sx={{ height: 'auto', width: '100%' }}>
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
            <IconButton aria-label="navigate to contact" href="#experience" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="Experience"
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
            display: 'flex',
            gap: 2,
            flexDirection: 'column',
            alignItems: 'flex-start',
            height: '100%',
            width: '100%',
            px: 4,
          }}
        >
          <Typography variant="h6" component={'p'} sx={{ fontWeight: 500 }}>
            With 4+ years of software engineering experience, a masters degree in Web and Mobile
            Information systems, and a background in division one athletics, I bring a unique blend
            of technical expertise and competitive drive to every task and project I tackles. This
            combination enables me to approach challenges with both analytical precision and a
            determined mindset, ensuring innovative and effective solutions. Whether collaborating
            with a team or working independently, I leverages my diverse background to deliver
            high-quality results.
          </Typography>

          {/* Rebuilt from stable @mui/material primitives — @mui/lab's Timeline
              was dropped rather than shipped as a beta dependency (@mui/lab@9
              is 9.0.0-beta.8). Layout replicates the removed
              Timeline/TimelineItem/TimelineOppositeContent/TimelineSeparator/
              TimelineConnector/TimelineDot/TimelineContent structure
              measurement-for-measurement (date column width, dot size/shadow,
              connector width/color, card padding) rather than redesigning it;
              a redesign is Sprint 11's job. */}
          <Stack sx={{ width: '100%', alignItems: 'flex-start', py: 0.75, px: 2 }}>
            {experienceData.map((experience) => (
              <Stack
                key={experience.dateRange}
                direction="row"
                sx={{ width: '100%', minHeight: 70 }}
              >
                <Box sx={{ width: '175px', flex: '0 0 auto', textAlign: 'left', py: 0.75, px: 2 }}>
                  <Typography variant="body1">{experience.dateRange}</Typography>
                </Box>
                <Stack
                  sx={{
                    alignItems: 'center',
                    width: 36,
                    flex: '0 0 auto',
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 0.5,
                      my: '11.5px',
                      borderRadius: '50%',
                      bgcolor: 'grey.400',
                      boxShadow: 2,
                    }}
                  >
                    {experience.icon}
                  </Box>
                  <Box sx={{ width: '2px', flexGrow: 1, bgcolor: 'grey.400' }} />
                </Stack>
                <Box sx={{ flex: '1 1 0%', py: '12px', px: 2, width: '100%' }}>
                  <Card
                    sx={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: theme.palette.background.default,
                      border: `2px solid ${theme.palette.divider}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        // border: `2px solid gray`,
                        boxShadow: ' 0px 25px 20px -20px rgb(18, 72, 116)',
                      },
                    }}
                  >
                    <CardHeader
                      title={experience.title}
                      slotProps={{
                        title: { component: 'h3' },
                      }}
                    />
                    <CardContent>{experience.description}</CardContent>
                  </Card>
                </Box>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Experience;
