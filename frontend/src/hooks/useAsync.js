import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data when the component appears (and whenever `deps` change).
 * Gives back { data, loading, error, reload } so every page handles
 * loading / error / success the same way.
 *
 *   const { data, loading, error, reload } = useAsync(() => orderApi.mine({ page }), [page]);
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++requestId.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are provided by the caller
  }, deps);

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

/** Returns `value` only after it stops changing for `delay` ms (for search boxes). */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
