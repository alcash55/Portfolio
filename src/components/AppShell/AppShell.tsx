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

/**
 * AppShellLayoutContext context that provides the layout and a function to toggle the layout
 */
const AppShellLayoutContext = createContext({
  layout: <Default />,
  toggleLayout: (newLayout: string) => {},
});

/**
 * useAppShellLayout hook that returns the current layout and a function to toggle the layout
 * @returns {UseAppShellLayout}
 */
export const useAppShellLayout = () => {
  const context = useContext(AppShellLayoutContext);
  return context;
};

/**
 * The AppShellProvider component that provides the layout context
 * @param {PropsWithChildren} children - children to render
 * @returns {JSX.Element}
 */
export default function AppShellProvider({ children }: PropsWithChildren) {
  const [layout, setLayout] = useState(<Default children={children} />);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(650));

  useEffect(() => {
    //set initial layout
    let layout = "default";

    //check window size for mobile bp if not mobile get layout from local storage
    if (isMobile) {
      layout = "mobile";
    } else if (localStorage.getItem("layout") === "sideNav") {
      layout = "sideNav";
    }

    toggleLayout(layout);
  }, [isMobile, window.innerWidth]);

  /**
   * logic for toggling layout (mobile, default, sideNav)
   * @param {string} newLayout - new layout to set
   */
  const toggleLayout = (newLayout: string) => {
    if (isMobile) {
      setLayout(<Mobile children={children} />);
    } else if (newLayout === "default") {
      setLayout(<Default children={children} />);
    } else if (newLayout === "sideNav") {
      setLayout(<SideNav children={children} />);
    } else {
      setLayout(<Default children={children} />);
    }

    localStorage.setItem("layout", newLayout); // update local storage
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
