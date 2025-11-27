import { ReactNode, useEffect, useState } from 'react';

import { createPyWebViewMock } from './mocks/mockPyWebView';
import Loader from './shared/components/Loader/Loader';

type PyWebViewProviderProps = {
  children: ReactNode;
  isStandalone: boolean;
};

const PyWebViewProvider = ({
  children,
  isStandalone,
}: PyWebViewProviderProps) => {
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    // Create mock for `window.pywebview` when running in standalone.
    if (isStandalone) {
      createPyWebViewMock();
      setIsReady(true);
      return;
    }

    const checkPyWebViewReady = () => {
      if (!window.pywebview?.api || !window.pywebview?.state) {
        return false;
      }

      setIsReady(true);

      return true;
    };

    // Try to check before waiting for the 'pywebviewready' event.
    if (checkPyWebViewReady()) {
      return;
    }

    // Check when `pywebviewready` event triggers.
    window.addEventListener('pywebviewready', checkPyWebViewReady);

    return () => {
      window.removeEventListener('pywebviewready', checkPyWebViewReady);
    };
  }, [isStandalone]);

  if (!isReady) {
    return <Loader isFullscreen />;
  }

  return children;
};

export default PyWebViewProvider;
