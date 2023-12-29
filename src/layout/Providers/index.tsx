import type { PropsWithChildren } from 'react';
import { RouterProvider } from 'react-router-dom';
import {Router} from '../../components/Router/Router'

export function Providers({ children }: PropsWithChildren<{}>) {
    return (
        <RouterProvider router={Router} />
    );
}