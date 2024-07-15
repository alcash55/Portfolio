import {
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Stack,
  Typography,
} from "@mui/material";
import logo from "../../../assets/Logo.svg";

const Summary = () => {
  return (
    <Stack id="summary" component={"section"}>
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
          title="Hello, I'm Alex!"
        />
        <CardContent>
          {/* <CardMedia component="img" height="100%" alt="logo" image={logo} /> */}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Summary;
