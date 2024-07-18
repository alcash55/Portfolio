import { lazy } from "react";

export const Pages = {
  Home: lazy(() => import("./Home")),
  About: lazy(() => import("./About")),
  Contact: lazy(() => import("./Contact")),
  Error: lazy(() => import("./Error")),
  Projects: lazy(() => import("./Projects")),
  Summary: lazy(() => import("./Summary")),
  Experience: lazy(() => import("./Experience")),
};
