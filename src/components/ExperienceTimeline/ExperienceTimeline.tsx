import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent, {
  timelineContentClasses,
} from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineOppositeContent, {
  timelineOppositeContentClasses,
} from "@mui/lab/TimelineOppositeContent";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import { useState } from "react";

interface ExperienceTimelineProps {
  experiences: {
    date: string;
    dateRange: string;
    title: string;
    description: JSX.Element;
    icon: JSX.Element;
  }[];
}

const ExperienceTimeline = ({ experiences }: ExperienceTimelineProps) => {
  const [experience, setExperience] = useState<JSX.Element>(
    experiences[experiences.length - 1].description
  );
  const [header, setHeader] = useState<string>(
    experiences[experiences.length - 1].title
  );
  const [avatar, setAvatar] = useState<JSX.Element>(
    experiences[experiences.length - 1].icon
  );
  const [dateRange, setDateRange] = useState<string>(
    experiences[experiences.length - 1].dateRange
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <Timeline
        position="left"
        sx={{
          [`& .${timelineOppositeContentClasses.root}`]: {
            flex: 0.2,
          },
        }}
      >
        {experiences.map((exprience, idx) => {
          return (
            <TimelineItem
              key={idx}
              onClick={() => {
                setExperience(exprience.description);
                setHeader(exprience.title);
                setAvatar(exprience.icon);
                setDateRange(exprience.dateRange);
              }}
              sx={{ my: 1 }}
            >
              <TimelineOppositeContent color="textSecondary" sx={{ mt: 1.5 }}>
                {exprience.date}
              </TimelineOppositeContent>
              <TimelineSeparator sx={{ pr: 1, pl: 3 }}>
                <TimelineDot sx={{ bgcolor: "#ffffff" }}>
                  {exprience.icon}
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <Button
                component={TimelineContent}
                variant="outlined"
                sx={{
                  pl: 2,
                  m: 0,
                  py: 0,
                  height: "auto",
                }}
              >
                {exprience.title}
              </Button>
            </TimelineItem>
          );
        })}
      </Timeline>
      <Card sx={{ maxWidth: "50%", bgcolor: "#202020" }}>
        <CardHeader
          component="h2"
          title={header}
          titleTypographyProps={{ fontSize: "1.5rem" }}
          subheader={dateRange}
          avatar={avatar}
        />
        <CardContent>{experience}</CardContent>
      </Card>
    </Box>
  );
};

export default ExperienceTimeline;
