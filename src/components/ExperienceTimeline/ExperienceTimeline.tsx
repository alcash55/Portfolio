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
      <Card sx={{ maxWidth: "50%", bgcolor: "#202020" }}>
        <CardHeader component="h2" title={header} avatar={avatar} />
        <CardContent>{experience}</CardContent>
      </Card>

      <Timeline
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
              }}
              sx={{ textAlign: "start" }}
            >
              <TimelineOppositeContent color="textSecondary">
                {exprience.date}
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot sx={{ bgcolor: "#ffffff" }}>
                  {exprience.icon}
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <Button
                component={TimelineContent}
                variant="text"
                textAlign="left"
                sx={{
                  textAlign: "left",
                  ml: 2,
                  m: 0,
                  py: 0,
                  height: "auto",
                  "& .MuiButton-text .MuiTimeline-root .MuiTimeline-positionRight .MuiTimeline-root":
                    {
                      position: "absolute",
                      textAlign: "left",
                    },
                }}
              >
                {exprience.title}
              </Button>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Box>
  );
};

export default ExperienceTimeline;
