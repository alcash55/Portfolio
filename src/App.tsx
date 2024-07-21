import { Suspense } from "react";
import { Providers } from "./layout/Providers";
import { RouterProvider } from "react-router-dom";
import { Router } from "./components/Router/Router";
import { Loading } from "./components/Loading/Loading";

function App() {
  const loading = (
    <Loading loading={true}>
      <></>
    </Loading>
  );

  return (
    <Providers>
      <Suspense fallback={loading}>
        <RouterProvider router={Router} fallbackElement={loading} />
      </Suspense>
    </Providers>
  );
}

export default App;
