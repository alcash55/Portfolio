import React from "react";
import { ListItemText, ListItem, List } from "@mui/material";
import Voyix from "../../../assets/icons/Voyix";
import Ncr from "../../../assets/icons/Ncr";
import Rmu from "../../../assets/icons/Rmu";

export const experienceData = [
  {
    date: "2020",
    title: "Software Engineer Intern at NCR Corporation",
    description: (
      <List sx={{ listStyleType: "disc", pl: 2 }}>
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
    title: "Graduated from Robert Morris University",
    description: (
      <List sx={{ listStyleType: "disc", pl: 2 }}>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="" />
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          <ListItemText primary="" />
        </ListItem>
      </List>
    ),
    icon: <Rmu />,
  },
  {
    date: "2021",
    title: "UI Engineer I at NCR Corporation",
    description: (
      <List sx={{ listStyleType: "disc", pl: 2 }}>
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
    date: "2023",
    title: "Software Engineer II at NCR Voyix Corporation",
    description: (
      <List sx={{ listStyleType: "disc", pl: 2 }}>
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
