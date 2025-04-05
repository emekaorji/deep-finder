import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

type SearchOptions = {
  preserveCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  onlyViewport: boolean;
};

type SearchOptionsStorage = BaseStorage<SearchOptions> & {
  toggleOption: (option: keyof SearchOptions) => Promise<void>;
};

const storage = createStorage<SearchOptions>(
  'search-options-storage-key',
  {
    preserveCase: false,
    wholeWord: false,
    useRegex: false,
    onlyViewport: false,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// You can extend it with your own methods
export const searchOptionsStorage: SearchOptionsStorage = {
  ...storage,
  toggleOption: async (option) => {
    await storage.set((currentOptions) => {
      return {
        ...currentOptions,
        [option]: !currentOptions[option],
      };
    });
  },
};
