import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ContactForm from "../../ConnectForm/ConnectForm";
import LinkIcon from "@mui/icons-material/Link";

const Contact = () => {
  const theme = useTheme();
  const largeMobile = useMediaQuery(theme.breakpoints.down(425));
  return (
    <Stack id="contact" component={"section"}>
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          width: "100%",
          p: 0,
          m: 0,
        }}
      >
        <CardHeader
          sx={{
            width: "100%",
          }}
          titleTypographyProps={{
            textAlign: "start",
            variant: "h4",
            component: "h1",
          }}
          avatar={
            <IconButton
              aria-label="navigate to contact"
              href="#contact"
              sx={{ zIndex: 0 }}
            >
              <LinkIcon />
            </IconButton>
          }
          title="Contact"
        />
        <CardContent
          sx={{
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
            height: "100%",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography
            variant="h3"
            component="h2"
            sx={{
              textAlign: "center",
              fontSize: largeMobile ? "1.5rem" : "2rem",
            }}
          >
            Have any questions or comments, or just want to connect?
          </Typography>

          <ContactForm />
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Contact;
