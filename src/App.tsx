import { Suspense } from "react";
import { Providers } from "./layout/Providers";
import { Loading } from "./components/Loading/Loading";

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Providers />
    </Suspense>
  );
}

export default App;
