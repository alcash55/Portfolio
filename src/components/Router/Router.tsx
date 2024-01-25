import {
  Route,
  Routes,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import { Pages } from "../Pages";

export const Router = createBrowserRouter(
  createRoutesFromElements(
    <Routes>
      <Route path="/" element={<Pages.Home />} errorElement={<Pages.Error />} />
    </Routes>
  )
);
