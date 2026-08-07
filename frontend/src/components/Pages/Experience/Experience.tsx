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
              variant: 'h4',
              component: 'h2',
              sx: { textAlign: 'start' },
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
            // At `xs`, every px of horizontal padding here is a px the timeline
            // cards below don't have -- the fixed 36px dot rail plus this and
            // the two nested Stack/Box paddings were together eating 212px of a
            // 320px-wide section, leaving each card only ~108px (enough that
            // `overflowWrap` had to break mid-word to stay on-card). Trimming
            // padding at `xs` only -- `sm`+ keeps the original `px: 4` --
            // reclaims real width without touching desktop.
            px: { xs: 1.5, sm: 4 },
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
              a redesign is Sprint 11's job.

              Below `sm`, the fixed `[175px date][36px dot][card]` row no longer
              fits (320px section width, 211px already spent on the first two
              columns). Rather than shrinking the date column or forcing a
              `minWidth: 0` fight with the card's own content (both tried in
              Sprint 7 -- see git history -- and both wrong: the former still
              overflows once text wraps, the latter collapses the card to
              min-content), the date is rendered twice: once in its original
              175px column (hidden below `sm`) and once stacked above the card
              inside the content column (hidden `sm` and up). Only one is ever
              in the accessibility tree at a time (`display: none` removes the
              other), so this isn't a duplicate-announcement regression. The
              dot/connector rail stays a left rail at every width -- dropping
              it loses the one piece of this layout that reads as a timeline
              at a glance. Desktop (`sm`+) renders byte-for-byte the same CSS
              as before this change. */}
          <Stack sx={{ width: '100%', alignItems: 'flex-start', py: 0.75, px: { xs: 1, sm: 2 } }}>
            {experienceData.map((experience) => (
              <Stack
                key={experience.dateRange}
                direction="row"
                sx={{ width: '100%', minHeight: 70 }}
              >
                <Box
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    width: '175px',
                    flex: '0 0 auto',
                    textAlign: 'left',
                    py: 0.75,
                    px: 2,
                  }}
                >
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
                <Box
                  sx={{
                    flex: '1 1 0%',
                    py: '12px',
                    px: { xs: 1, sm: 2 },
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <Typography variant="body1" sx={{ display: { xs: 'block', sm: 'none' }, mb: 1 }}>
                    {experience.dateRange}
                  </Typography>
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
                      // `CardHeader`'s own content wrapper is `flex: '1 1 auto'`
                      // internally with no `min-width` override, so it's subject
                      // to the same flex automatic-minimum-size trap as the row
                      // above: without this, the title's intrinsic min-content
                      // (its longest unbroken word) can exceed the card's own
                      // width and spill past its border instead of wrapping.
                      // `overflowWrap` handles the remaining case a min-width
                      // fix can't -- once the card is only ~108px wide (320px
                      // viewport, 5 uniform cards), a single long word like
                      // "Corporation" is wider than that on its own; without
                      // permission to break mid-word it paints past the card's
                      // border into the page's empty margin instead of onto a
                      // second line.
                      sx={{
                        '& .MuiCardHeader-content': { minWidth: 0 },
                        '& .MuiCardHeader-title': { overflowWrap: 'break-word' },
                      }}
                      title={experience.title}
                      slotProps={{
                        title: { component: 'h3' },
                      }}
                    />
                    <CardContent sx={{ overflowWrap: 'break-word' }}>
                      {experience.description}
                    </CardContent>
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
