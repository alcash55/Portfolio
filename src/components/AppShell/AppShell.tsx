import { Pages } from "../Pages";
import { NavBar } from "./NavBar";

export const AppShell = () => {
  return (
    <>
      <NavBar />
      <Pages.Home />
    </>
  );
};
