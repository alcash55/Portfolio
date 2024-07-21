import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ConnectWithoutContact,
  Construction,
  EmojiPeople,
  Home,
  Menu,
  Work,
} from "@mui/icons-material";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import MailIcon from "@mui/icons-material/Mail";
import DownloadIcon from "@mui/icons-material/Download";
import Resume from "../../../assets/resume2024.pdf";
import logo from "../../../assets/Logo.svg";

const Summary = () => {
  return (
    <Stack id="summary" component={"section"}>
      <Card
        sx={{
          height: "100%",
          width: "100%",
          p: 0,
          m: 0,
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            gap: 1,
          }}
        >
          {/* <CardMedia component="img" height="100%" alt="logo" image={logo} /> */}
          <Typography variant="h3" component={"h1"}>
            Alex Cash
          </Typography>
          <Typography variant="h4" component={"h2"}>
            Software Engineer
          </Typography>
          <Box sx={{ display: "flex", justigyContent: "space-evenly" }}>
            <IconButton
              size="large"
              href="https://github.com/alcash55"
              target="_blank"
              aria-label="Navigate to GitHub"
            >
              <GitHubIcon />
            </IconButton>
            <IconButton
              size="large"
              href="https://www.linkedin.com/in/alexander-cash/"
              target="_blank"
              aria-label="Navigate to LinkedIn"
            >
              <LinkedInIcon />
            </IconButton>
            <IconButton
              size="large"
              href="#contact"
              aria-label="Navigate to Contact"
            >
              <MailIcon />
            </IconButton>
            <IconButton
              size="large"
              href={Resume}
              target="_blank"
              aria-label="Download Alex's Resume"
            >
              <DownloadIcon />
            </IconButton>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-evenly",
              gap: 3,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<EmojiPeople />}
              href="#about"
              aria-label="Navigate to About Me"
            >
              About me
            </Button>
            <Button
              variant="outlined"
              startIcon={<Work />}
              href="#experience"
              aria-label="Navigate to Experience"
            >
              Experience
            </Button>
            <Button
              variant="outlined"
              startIcon={<Construction />}
              href="#projects"
              aria-label="Navigate to Projects"
            >
              Projects
            </Button>
            <Button
              variant="outlined"
              startIcon={<ConnectWithoutContact />}
              href="#contact"
              aria-label="Navigate to Contact"
            >
              Contact
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Summary;
