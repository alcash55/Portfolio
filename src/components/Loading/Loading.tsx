import { CircularProgress, Box } from "@mui/material";
import React from "react";
import { ReactNode } from "react";

interface LoadingProps {
  loading: boolean;
  children: ReactNode;
  [key: string]: any;
}

export const Loading = ({ loading, children, ...props }: LoadingProps) => {
  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          yOverflow: "hidden",
        }}
      >
        <CircularProgress />
      </Box>
    );
  } else {
    <React.Fragment {...props}>{children}</React.Fragment>;
  }
};
