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
import { alpha } from '@mui/material/styles';
import LinkIcon from '@mui/icons-material/Link';
import { experienceData } from './experienceData';

const Experience = () => {
  const theme = useTheme();

  return (
    <Stack id="experience" component={'section'} sx={{ height: 'auto', width: '100%' }}>
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
            <IconButton aria-label="navigate to experience" href="#experience" sx={{ zIndex: 0 }}>
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
          <Typography variant="h6" component={'p'} sx={{ fontWeight: 500, maxWidth: '72ch' }}>
            Four years of software engineering, a master&apos;s in Web and Mobile Information
            Systems, and a background in Division I athletics. I approach problems analytically and
            see them through &mdash; whether I&apos;m working with a team or on my own.
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
                      // Deliberately NOT `height: '100%'`. Its containing block is this
                      // row's content column, a flex item of the `[date][dot][card]` row
                      // Stack -- and percentage heights inside a stretched flex item
                      // resolve through the same hypothetical-size pass that determines
                      // the row's own auto height, which is circular: the row's height
                      // depends on this card's height, which (via 100%) depends on the
                      // row's height. Below `sm`, where the date renders *inside* this
                      // column instead of in its own row cell, that circularity resolved
                      // to a height matching the card's content ALONE -- silently
                      // excluding the stacked date's own 32px (24px line + 8px margin)
                      // from the row's total, so the card overflowed the row by exactly
                      // that amount and visually overlapped the next entry's date.
                      // Auto height breaks the loop and lets the card (and therefore the
                      // row) size to its real content.
                      width: '100%',
                      backgroundColor: theme.palette.background.default,
                      border: `2px solid ${theme.palette.divider}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        // Theme-derived, not a hardcoded blue: the fixed
                        // `rgb(18, 72, 116)` read fine in the original dark theme but was
                        // still a navy glow under the red/purple/green themes and fought
                        // the light theme's bright background. Same offset/blur/spread
                        // geometry as before -- only the hue (and its alpha, standing in
                        // for the fixed color's implied darkness) now follows
                        // `primary.main`. Alpha 0.55 matches Skills.tsx's identical glow
                        // so hovering a Skills chip and an Experience card read as the
                        // same effect.
                        boxShadow: `0px 25px 20px -20px ${alpha(theme.palette.primary.main, 0.55)}`,
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
