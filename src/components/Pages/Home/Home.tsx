import { Stack } from "@mui/material";
import { Pages } from "../../Pages";

const Home = () => {
  return (
    <Stack
      component={"article"}
      spacing={2}
      sx={{ px: 3, py: 2, width: "100%", height: "100%" }}
    >
      <Pages.Summary />
      <Pages.About />
      <Pages.Experience />
      <Pages.Projects />
      <Pages.Contact />
    </Stack>
  );
};

export default Home;
