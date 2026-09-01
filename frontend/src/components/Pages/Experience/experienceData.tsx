import { ListItemText, ListItem, List } from '@mui/material';
import Voyix from '../../../assets/icons/Voyix';
import Ncr from '../../../assets/icons/Ncr';
import Rmu from '../../../assets/icons/Rmu';
import SoleaEnergy from '../../../assets/icons/SoleaEnergy';

export const experienceData = [
  {
    dateRange: '7/2020 - 9/2020',
    title: 'Software Engineer Intern at NCR Corporation',
    description: (
      <List sx={{ listStyleType: 'disc', pl: 3.5, py: 0 }}>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Piped in-store kitchen data from NCR APIs into Google Cloud Platform for the business intelligence team" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Built order routing that reacted to real-time kitchen capacity, using Python machine learning libraries" />
        </ListItem>
      </List>
    ),
    icon: <Ncr />,
  },
  {
    dateRange: '8/2016 - 5/2021',
    title: 'Graduated from Robert Morris University',
    description: (
      <List sx={{ listStyleType: 'disc', pl: 3.5, py: 0 }}>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Completed a Masters of Science in Web & Mobile Information Systems with a GPA of 3.78" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Completed a Bachelor of Science in Software Engineering with a GPA of 3.24" />
        </ListItem>
        {/* A real `<li>` wraps the sub-list -- `<ul>` cannot be a direct child of
            `<ul>` (Lighthouse's `list` audit) -- but `display: 'block'` (not
            `list-item`) keeps it from drawing its own bullet with no text next
            to it; the circle bullets below come from the nested list itself. */}
        <ListItem sx={{ display: 'block', py: 0, px: { xs: 0, sm: 2 } }}>
          <List sx={{ listStyleType: 'circle', pl: 4.5, py: 0 }}>
            <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
              <ListItemText primary="Minored in Data Analytics" />
            </ListItem>
          </List>
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Put 40+ hours a week into D1 lacrosse, between practice, lifting, film study and community service, alongside a full course load" />
        </ListItem>
      </List>
    ),
    icon: <Rmu />,
  },
  {
    dateRange: '7/2021 - 4/2023',
    title: 'UI Engineer I at NCR Corporation',
    description: (
      <List sx={{ listStyleType: 'disc', pl: 3.5, py: 0 }}>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Architected the Store Health project for Starbucks UK, from design through delivery" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Built custom React components into the NCR Design System and supported the product teams adopting it" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Automated accessibility scoring across NCR products, giving every team a compliance signal per build, and rolled out Google Tag Manager and FullStory across digital connected services" />
        </ListItem>
      </List>
    ),
    icon: <Ncr />,
  },
  {
    dateRange: '4/2023 - 6/2024',
    title: 'Software Engineer II at NCR Voyix Corporation',
    description: (
      <List sx={{ listStyleType: 'disc', pl: 3.5, py: 0 }}>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Redesigned the Voyix Doc Site around navigation and search, and restructured the Commerce Design Docs that product teams build against" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Extended the static analysis composite GitHub Actions the doc site runs on, tightening the checks that gate every merge" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Designed and shipped the global experience analytics pipeline behind Voyix's digital products" />
        </ListItem>
      </List>
    ),
    icon: <Voyix />,
  },
  {
    dateRange: '8/2024 - Present',
    title: 'Software Engineer at Solea Energy',
    description: (
      <List sx={{ listStyleType: 'disc', pl: 3.5, py: 0 }}>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Architected and built a seven-ISO trade submission API platform (CAISO, ERCOT, MISO, NEISO, NYISO, PJM, SPP) from the ground up in Go, standardizing validation, error handling and fault resilience across all seven markets traders participate in" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Built the Portfolio Credit Analysis micro-frontend and its backing Go API from a Storybook spec, including ISO-specific bid-curve calculations and credit summary data models" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Delivered the FTR (Financial Transmission Rights) mapping feature end to end: UI mockups, REST API, Snowflake-backed data model and Beyond UI pages, retiring a recurring manual support burden" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Built the Beyond FaaS platform's worker runtime, router and Helm deployment, a Kubernetes-native function-as-a-service system running Go and Python plugins with CI/CD, MinIO-backed artifact storage and identity-aware auth middleware" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Designed and built an internal developer portal end to end: a sync ETL pulling GitHub catalog metadata into Snowflake, a read-only catalog API and a React/TypeScript UI" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', py: 0, px: { xs: 0, sm: 2 } }}>
          <ListItemText primary="Migrated core Beyond UI components from PrimeReact/PrimeFlex to TypeScript and shadcn/ui, and built solea.energy from an empty repository in React/TypeScript/Vite with SSR pre-rendering" />
        </ListItem>
      </List>
    ),
    icon: <SoleaEnergy />,
  },
];
