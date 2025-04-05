import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

type SearchInput = string;

type SearchInputStorage = BaseStorage<SearchInput> & {
  setSearchInput: (searchInput: string) => Promise<void>;
  getSearchInput: () => Promise<SearchInput>;
};

const storage = createStorage<SearchInput>('search-input-storage-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// You can extend it with your own methods
export const searchInputStorage: SearchInputStorage = {
  ...storage,
  setSearchInput: async (searchInput) => {
    await storage.set(searchInput);
  },
  getSearchInput: async () => {
    return await storage.get();
  },
};
