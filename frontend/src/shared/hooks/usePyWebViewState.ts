import { useEffect, useState } from 'react';
import { PyWebViewStateEventDetail } from 'types/pywebview/pywebview-state';

type UsePyWebViewProps<T> = {
  key: string;
  initialValue?: T;
};

function usePyWebViewState<T>({
  initialValue,
  key,
}: UsePyWebViewProps<T> & { initialValue: T }): T;
function usePyWebViewState<T>({
  initialValue,
  key,
}: UsePyWebViewProps<T>): T | undefined;

function usePyWebViewState<T>({ initialValue, key }: UsePyWebViewProps<T>) {
  const [value, setValue] = useState<T | undefined>(initialValue);

  useEffect(() => {
    const handleValueChange = ({
      detail,
    }: CustomEvent<PyWebViewStateEventDetail>) => {
      if (detail.key === key) {
        setValue(detail.value as T);
      }
    };

    window.pywebview.state.addEventListener('change', handleValueChange);

    return () => {
      window.pywebview.state.removeEventListener('change', handleValueChange);
    };
  }, [key]);

  return value;
}

export default usePyWebViewState;
