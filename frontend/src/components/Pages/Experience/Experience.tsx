import { Stack, Card, CardHeader, IconButton, CardContent, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { experienceData } from './experienceData';

import {
  Timeline,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
  TimelineConnector,
  TimelineDot,
  TimelineContent,
} from '@mui/lab';

const Experience = () => {
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
          titleTypographyProps={{
            textAlign: 'start',
            variant: 'h4',
            component: 'h1',
          }}
          avatar={
            <IconButton aria-label="navigate to contact" href="#experience" sx={{ zIndex: 0 }}>
              <LinkIcon />
            </IconButton>
          }
          title="Experience"
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

          <Timeline sx={{ alignItems: 'flex-start' }}>
            {experienceData.map((experience, idx) => (
              <TimelineItem key={experience.dateRange}>
                <TimelineOppositeContent
                  sx={{ width: '175px', textAlign: 'left', flex: '0 0 auto' }}
                >
                  {experience.dateRange}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  {idx === experienceData.length - (experienceData.length - 1) && (
                    <TimelineConnector />
                  )}
                  <TimelineDot>{experience.icon}</TimelineDot>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent sx={{ py: '12px', px: 2, width: '100%' }}>
                  <Card
                    sx={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#18181b',
                      border: '2px solid #27272a',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        // border: `2px solid gray`,
                        boxShadow: ' 0px 25px 20px -20px rgb(18, 72, 116)',
                      },
                    }}
                  >
                    <CardHeader title={experience.title} />
                    <CardContent>{experience.description}</CardContent>
                  </Card>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Experience;
