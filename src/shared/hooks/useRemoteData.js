import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useRemoteData(path) {
  const { request } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setState({ loading: true, data: null, error: '' });
      return request(path, { signal: controller.signal }).then(
        (data) => {
          if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
        },
        (error) => {
          if (!controller.signal.aborted)
            setState({ loading: false, data: null, error: error.message });
        },
      );
    });
    return () => controller.abort();
  }, [path, request, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
