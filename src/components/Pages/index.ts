import { lazy } from "react";

export const Pages = {
    Home: lazy(() => import('./Home')),
    About: lazy(() => import('./About')),
    Error: lazy(() => import('./Error')),
}