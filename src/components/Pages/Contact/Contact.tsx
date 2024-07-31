import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Stack,
} from "@mui/material";
import ContactForm from "../../ConnectForm/ConnectForm";
import LinkIcon from "@mui/icons-material/Link";

const Contact = () => {
  return (
    <Stack
      id="contact"
      component={"section"}
      sx={{ height: "calc(100vh - 73.98px)" }}
    >
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
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <ContactForm />
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Contact;
