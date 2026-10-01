import { useEffect, useState } from 'react';

import type { AppState, Transcript } from 'types/pywebview/pywebview-api';
import type { PyWebViewStateEvent } from 'types/pywebview/pywebview-state';

/** Subscribe once, hydrate on readiness, and reject stale snapshot responses. */
export const useStudio = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [transcript, setTranscript] = useState<null | Transcript>(null);
  const [error, setError] = useState<null | string>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const accept = (next: AppState) => {
      if (isMounted) {
        setState((previous) =>
          !previous || next.revision > previous.revision ? next : previous,
        );
      }
    };
    const handleChange = (event: PyWebViewStateEvent) => {
      if (event.detail.key === 'studio') {
        accept(event.detail.value);
      }
    };
    window.pywebview.state.addEventListener('change', handleChange);
    window.pywebview.api
      .get_state()
      .then(accept)
      .catch((reason: Error) => {
        if (isMounted) {
          setError(reason.message);
        }
      });
    return () => {
      isMounted = false;
      window.pywebview.state.removeEventListener('change', handleChange);
    };
  }, []);

  const transcriptId = state?.transcriptId;
  useEffect(() => {
    let isMounted = true;
    if (!transcriptId) {
      return;
    }
    window.pywebview.api
      .get_transcript(transcriptId)
      .then((result) => {
        if (isMounted) {
          setTranscript(result);
        }
      })
      .catch((reason: Error) => {
        if (isMounted) {
          setError(reason.message);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [transcriptId]);

  /** Catch every UI command rejection at the same visible boundary. */
  const act = (operation: () => Promise<unknown>) => {
    setError(null);
    setIsPending(true);
    // Handle synchronous callbacks and rejected bridge promises at one boundary.
    Promise.resolve()
      .then(operation)
      .then(
        () => setIsPending(false),
        (reason: unknown) => {
          setError(reason instanceof Error ? reason.message : String(reason));
          setIsPending(false);
        },
      );
  };

  return {
    act,
    error,
    setError,
    state,
    transcript: transcript?.id === transcriptId ? transcript : null,
    isPending,
    clearError: () => setError(null),
  };
};
