import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type StoreState = {
  file: null | string;
  model: null | string;
};

type StoreActions = {
  setFile: (absolutePath: string) => void;
};

type Store = StoreState & StoreActions;

const initialState: StoreState = {
  file: null,
  model: null,
};

const useAppStore = create<Store>()(
  devtools((set) => {
    const store: Store = {
      ...initialState,

      // Actions
      setFile: (absolutePath: string) => set({ file: absolutePath }),
    };

    return store;
  }),
);

export default useAppStore;
