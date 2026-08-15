import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Data-fetching hook with abort-on-unmount, loading/error states and
 * an imperative reload. Works with any (signal) => Promise fn.
 *
 * const { data, loading, error, reload } = useApi(getYears);
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    // Synchronous state reset is intentional: each fetch cycle must start
    // from a clean loading/error slate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    setError(null);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return;
        setError(err?.message || 'Something went wrong.');
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, reload };
}

/** Debounce a fast-changing value (search input). */
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // Classic debounce: the timer-driven setState is the point.

    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Document head manager — sets title + meta description per route.
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}

/** Track viewport width bucket for responsive decisions without re-render storms. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    // Sync initial value in case it changed between render and effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
