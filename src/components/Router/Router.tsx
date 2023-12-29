import { Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom";
import { Pages } from '../Pages'

export const Router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<Pages.Home />}>
        </Route>
    )
);