import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import { Default } from "./InternalComponents/Layouts/Default";
import { SideNav } from "./InternalComponents/Layouts/SideNav";
import { Mobile } from "./InternalComponents/Layouts/Mobile";

const AppShellLayoutContext = createContext({
  layout: <Default />,
  toggleLayout: (newLayout: string) => {},
});

export const useAppShellLayout = () => {
  const context = useContext(AppShellLayoutContext);
  return context;
};

/**
 * The AppShellProvider component that provides the layout context
 * @param {PropsWithChildren} children - children to render
 * @returns
 */
export default function AppShellProvider({ children }: PropsWithChildren) {
  const [layout, setLayout] = useState(<Default children={children} />);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(650));

  // Run only on mount to set initial layout and set local storage
  useEffect(() => {
    const initialLayout = localStorage.getItem("layout") || "default";
    toggleLayout(initialLayout);
  }, []);
  //check window size for mobile bp
  useEffect(() => {
    const newLayout = isMobile ? "mobile" : "default";
    toggleLayout(newLayout);
  }, [window.innerWidth]);

  /**
   * logic for toggling layout (mobile, default, sideNav)
   * @param {string} newLayout - new layout to set
   */
  const toggleLayout = (newLayout: string) => {
    if (isMobile) setLayout(<Mobile children={children} />);
    if (newLayout === "default") setLayout(<Default children={children} />);
    else if (newLayout === "sideNav")
      setLayout(<SideNav children={children} />);

    localStorage.setItem("layout", isMobile ? "mobile" : newLayout); //update local storage
  };

  const contextValue = {
    layout,
    toggleLayout,
  };
  return (
    <AppShellLayoutContext.Provider value={contextValue}>
      {layout}
    </AppShellLayoutContext.Provider>
  );
}
