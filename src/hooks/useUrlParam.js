import { useLocation } from 'react-router-dom';

// Returns the current value of a URL search param and re-renders whenever it
// changes — so pages can react to notification deep-links even when the user
// is already on the target page (no remount).
export function useUrlParam(name) {
    const { search } = useLocation();
    return new URLSearchParams(search).get(name);
  }