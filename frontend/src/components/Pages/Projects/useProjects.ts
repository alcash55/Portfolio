import { useEffect, useState } from 'react';

/**
 * Live metadata for one allow-listed repo, exactly as returned by
 * `GET /api/v1/projects`. Field names/casing are the fixed interface
 * contract with the backend -- do not rename.
 */
export interface ApiProject {
  name: string;
  description: string;
  url: string;
  homepage: string;
  language: string;
  stars: number;
  topics: string[];
  updatedAt: string;
}

interface ApiProjectsResponse {
  projects: ApiProject[];
  stale: boolean;
}

// Mirrors useConnectForm's cold-start allowance: the Render free plan spins
// down after ~15min idle and can take ~50s to wake. A hung fetch must not
// leave skeletons up forever, so this gives a real cold start room to
// finish rather than aborting right before it would have succeeded.
const PROJECTS_TIMEOUT_MS = 60_000;

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/**
 * Fetches live project metadata (stars, language, updatedAt, description)
 * to merge over the static project list. `apiProjects` is `null` whenever
 * there is nothing usable to merge -- still in flight, or after any
 * non-2xx status, network throw, or timeout -- so the caller can fall back
 * to the static list without inspecting *why* it failed. Same discipline as
 * useConnectForm: branch on status code, never on the response body's error
 * string, and never surface upstream failure to the visitor beyond one
 * console.error.
 *
 * `stale` mirrors the backend's own flag: true when it answered from cache
 * after failing to refresh, so the numbers on screen are real but may be
 * hours old. It is only ever true alongside data -- a fallback to the static
 * list leaves it false, because there is no live data to qualify.
 * @returns {{ apiProjects: ApiProject[] | null, isLoading: boolean, stale: boolean }}
 */
const useProjects = () => {
  const [apiProjects, setApiProjects] = useState<ApiProject[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Distinguishes an abort caused by the 60s timeout actually firing from
    // one caused by the effect's own cleanup (e.g. StrictMode's dev-only
    // double-invoke, or the section unmounting mid-request). Both raise the
    // same AbortError, but only the former is a real failure worth a
    // console.error -- an unmount isn't the backend's fault.
    let timedOut = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PROJECTS_TIMEOUT_MS);

    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/projects`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          // Contract: any non-2xx means fall back to static data. The body
          // may hold {"error": "..."} but that string is for logs only, so
          // it is deliberately not read here -- the status code is enough.
          console.error('Failed to load live project data, using static fallback', response.status);
          if (!cancelled) setApiProjects(null);
          return;
        }

        const data = (await response.json()) as ApiProjectsResponse;
        if (!cancelled) {
          setApiProjects(data.projects);
          // Coerced rather than trusted: the field is documented as a boolean
          // but this is the one value the UI shows the visitor directly, and
          // an older backend that omits it must read as fresh, not truthy.
          setStale(data.stale === true);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          if (timedOut) {
            console.error(
              'Projects request timed out waiting for a cold server, using static fallback',
            );
          }
          // else: aborted by cleanup, not a timeout -- nothing to report.
        } else {
          console.error('Failed to load live project data, using static fallback', e);
        }
        if (!cancelled) setApiProjects(null);
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  return { apiProjects, isLoading, stale };
};

export default useProjects;
