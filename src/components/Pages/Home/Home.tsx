import { Stack } from "@mui/material";
import { Pages } from "../../Pages";

const Home = () => {
  return (
    <Stack component={"article"}>
      <Pages.About />
      <Pages.Projects />
      <Pages.Contact />
    </Stack>
  );
};

export default Home;
