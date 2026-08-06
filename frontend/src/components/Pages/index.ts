// Statically imported (C3): Router.tsx has exactly one route, and that
// route's Home renders every one of these unconditionally, so React.lazy()
// here bought nothing but an extra chunk fetch and a Suspense stall for
// content nothing ever conditionally hides. See the sprint report for the
// before/after bundle measurements that back this out.
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
