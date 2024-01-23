import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Default } from "./InternalComponents/Layouts/Default";
import { SideNav } from "./InternalComponents/Layouts/SideNav";

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

  useEffect(() => {
    const initialLayout = localStorage.getItem("layout") || "default";
    toggleLayout(initialLayout);
  }, []); // Run only once on mount to set initial layout

  const toggleLayout = (newLayout: string) => {
    if (newLayout === "default") setLayout(<Default children={children} />);
    else if (newLayout === "sideNav")
      setLayout(<SideNav children={children} />);

    localStorage.setItem("layout", newLayout); //update local storage
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
