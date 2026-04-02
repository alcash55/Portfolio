import { CircularProgress, Box } from "@mui/material";
import React, { Fragment, ReactNode } from "react";

type LoadingProps = {
  loading: boolean;
  children: ReactNode;
} & React.ComponentPropsWithoutRef<typeof Fragment>;

/**
 * Conditionally renders a full-screen Material-UI spinner or the supplied children
 * @param props.loading - Controls whether the spinner is shown.
 * @param props.children - Elements displayed once loading finishes.
 * @param props - Any additional props are spread to the internal `Fragment`.
 * @returns A full-screen progress circle when `loading`, otherwise the wrapped children.
 */
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
          overflow: "hidden",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  return <Fragment {...props}>{children}</Fragment>;
};
