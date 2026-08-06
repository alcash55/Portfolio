// Statically imported on purpose. Router.tsx has exactly one route, and that
// route's Home renders every one of these unconditionally, so React.lazy()
// here bought nothing but an extra chunk fetch and a Suspense stall for
// content nothing ever conditionally hides: the browser had to load Home's
// chunk, discover the dynamic imports, then go back for more.
//
// Measured before reverting it: 13 JS chunks totalling ~517 kB raw / ~173 kB
// gzip, versus a single 513 kB / 166 kB gzip chunk once static. Fewer bytes
// and one request instead of a waterfall. Re-measure before reintroducing
// lazy() here -- it only pays off once something is conditionally rendered.
import Home from './Home';
import About from './About';
import Contact from './Contact';
import Error from './Error';
import Projects from './Projects';
import Experience from './Experience';
import Landing from './Landing';
import Skills from './Skills';

export const Pages = {
  Home,
  About,
  Contact,
  Error,
  Projects,
  Experience,
  Landing,
  Skills,
};
