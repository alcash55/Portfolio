import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import resumePdf from '../../../assets/AlexResume.pdf';

const About = () => {
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
          <Grid container spacing={4}>
            {/* Photos Section */}
            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              {/* <SwipeableCards /> */}
            </Grid>

            {/* Text Content */}
            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    Hey, I’m Alex Cash — Software Engineer
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      marginBottom: '16px',
                    }}
                  >
                    I enjoy building clean, scalable, and well-designed systems. I focus on software
                    that works great under the hood and delivers a smooth, intuitive experience for
                    users.
                  </Typography>
                  <Typography variant="body1">
                    I work across the stack, but my favorite projects blend front-end precision with
                    backend performance. I love working with React, TypeScript, and Go, and I lean
                    on modern tooling to move fast and keep things maintainable.
                  </Typography>
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
                    sx={{ mt: 2, color: 'primary.light', borderColor: 'primary.light' }}
                  >
                    View Resume
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="h6" component="h4" gutterBottom>
                    What Drives Me
                  </Typography>
                  <Stack component="ul" sx={{ pl: 3, gap: 1 }}>
                    <Typography component="li" variant="body2">
                      Writing code that’s simple, clear, and reliable
                    </Typography>
                    <Typography component="li" variant="body2">
                      Building systems that scale without sacrificing readability
                    </Typography>
                    <Typography component="li" variant="body2">
                      Collaborating with teams who care about craft and efficiency
                    </Typography>
                    <Typography component="li" variant="body2">
                      Always learning and refining how I work
                    </Typography>
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="h6" component="h4" gutterBottom>
                    Outside of Work
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    When I’m not coding, you’ll probably find me coaching lacrosse or spending time
                    with my two dogs. Coaching has taught me a lot about communication, patience,
                    and leadership — lessons that carry directly into how I approach software
                    development and teamwork.
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default About;
