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

export default function AppShellProvider({ children }: PropsWithChildren) {
  const [layout, setLayout] = useState(<Default children={children} />);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(650));

  useEffect(() => {
    const initialLayout = localStorage.getItem("layout") || "default";
    toggleLayout(initialLayout);
  }, []); // Run only once on mount to set initial layout

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
