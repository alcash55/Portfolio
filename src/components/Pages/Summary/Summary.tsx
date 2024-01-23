import { Card, Stack, Typography } from "@mui/material";

const Summary = () => {
  return (
    <Stack id="summary" component={"section"}>
      <Card sx={{ height: "100%" }}>
        <Typography>Summary</Typography>
      </Card>
    </Stack>
  );
};

export default Summary;
