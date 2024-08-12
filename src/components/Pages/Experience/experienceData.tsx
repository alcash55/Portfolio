import React from "react";
import { ListItemText, ListItem, List } from "@mui/material";
import Voyix from "../../../assets/icons/Voyix";
import Ncr from "../../../assets/icons/Ncr";
import Rmu from "../../../assets/icons/Rmu";

export const experienceData = [
  {
    date: "2020",
    dateRange: "7/2020 - 9/2020",
    title: "Software Engineer Intern at NCR Corporation",
    description: (
      <List sx={{ listStyleType: "disc", pl: 3.5 }}>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Processed data generated from instore kitchens using NCR APIs to Google Cloud Platform to provide better business intelligence and decision making" />
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Provided intelligent routing of orders based on real-time capacity with the use of Python machine learning libraries" />
        </ListItem>
      </List>
    ),
    icon: <Ncr />,
  },
  {
    date: "2021",
    dateRange: "8/2016 - 5/2021",
    title: "Graduated from Robert Morris University",
    description: (
      <List sx={{ listStyleType: "disc", pl: 3.5 }}>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Completed a Masters of Science in Web & Mobile Information Systems with a GPA of 3.78" />
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Completed a Bachelor of Science in Software Engineering with a GPA of 3.24" />
        </ListItem>
        <List sx={{ listStyleType: "circle", pl: 4.5 }}>
          <ListItem sx={{ display: "list-item" }}>
            <ListItemText primary="Minored in Data Analytics" />
          </ListItem>
        </List>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Dedicated 40+ hours as a D1 lacrosse player, practicing, lifting, analyzing game and practice film, and community service, while balancing a full academic course load" />
        </ListItem>
      </List>
    ),
    icon: <Rmu />,
  },
  {
    date: "2023",
    dateRange: "7/2021 - 4/2023",
    title: "UI Engineer I at NCR Corporation",
    description: (
      <List sx={{ listStyleType: "disc", pl: 3.5 }}>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Architected the design and development of the Store Health project for Starbucks UK, aligning technical solutions with business objectives and user needs" />
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Contributed to the integration of the NCR Design System with product teams, resolving issues and enriching functionality by crafting custom React components- Mitigated legal risks by implementing an automated framework to scan NCR products for accessibility scores, facilitating compliance and enhancing inclusivity" />
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Implemented Google Tag Manager and FullStory across digital connected services products, providing valuable analytics insights and facilitating efficient troubleshooting for future enhancements" />
        </ListItem>
      </List>
    ),
    icon: <Ncr />,
  },
  {
    date: "2024",
    dateRange: "4/2023 - 6/2024",
    title: "Software Engineer II at NCR Voyix Corporation",
    description: (
      <List sx={{ listStyleType: "disc", pl: 3.5 }}>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Orchestrated the innovation and refinement of existing static analysis composite GitHub Actions tailored for the Voyix Doc Site, ensuring streamlined workflows and enhanced code quality" />
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Led the architectural design and implementation efforts for global experience analytics initiatives, driving forward the development and deployment of scalable solutions\n- Elevated user satisfaction by spearheading the development of a comprehensive redesign of the Voyix Doc Site, focusing on intuitive navigation and seamless user interaction" />
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="Directed the development efforts in restructuring and expanding content within the Commerce Design Docs, ensuring comprehensive documentation for product teams" />
        </ListItem>
      </List>
    ),
    icon: <Voyix />,
  },
];
