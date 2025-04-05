import { useState, useCallback, useEffect, useRef } from 'react';
import { searchInputStorage, searchOptionsStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import useKeybindings from './useKeybindings';
import { highlightText, clearHighlights, focusIncomingMark, isInViewport } from './utils';

export default function App() {
  // Visibility
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // Search text
  const [searchText, setSearchText] = useState('');

  // Storage
  const options = useStorage(searchOptionsStorage);
  const input = useStorage(searchInputStorage);

  // Marked elements
  const [marks, setMarks] = useState<HTMLElement[]>([]);
  const [activeMarkIndex, setActiveMarkIndex] = useState(-1);

  // Cache the active mark index to re-highlight the last active mark when the search text does not change
  const cachedActiveMarkIndexAndSearchText = useRef({ activeMarkIndex: -1, searchText: '' });

  const handleSearchTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    // Defer the storage update to avoid blocking the main thread
    setTimeout(() => {
      searchInputStorage.setSearchInput(e.target.value);
    }, 0);
  }, []);

  const handlePreviousMark = useCallback(() => {
    if (!marks.length) return;

    setActiveMarkIndex((currentIndex) => {
      const incomingIndex = currentIndex === 0 ? marks.length - 1 : currentIndex - 1;
      const currentMark = marks[currentIndex];
      const incomingMark = marks[incomingIndex];
      focusIncomingMark(incomingMark, currentMark);
      return incomingIndex;
    });
  }, [marks]);

  const handleNextMark = useCallback(() => {
    if (!marks.length) return;

    setActiveMarkIndex((currentIndex) => {
      const incomingIndex = currentIndex === marks.length - 1 ? 0 : currentIndex + 1;
      const currentMark = marks[currentIndex];
      const incomingMark = marks[incomingIndex];
      focusIncomingMark(incomingMark, currentMark);
      return incomingIndex;
    });
  }, [marks]);

  const handleClosestMark = useCallback((newMarks: HTMLElement[], searchText: string) => {
    if (!newMarks.length) {
      setActiveMarkIndex(-1);
      return;
    }

    const { activeMarkIndex: cachedActiveMarkIndex, searchText: cachedSearchText } =
      cachedActiveMarkIndexAndSearchText.current;

    if (searchText === cachedSearchText) {
      setActiveMarkIndex(() => {
        const incomingIndex = cachedActiveMarkIndex;
        const incomingMark = newMarks[incomingIndex];
        focusIncomingMark(incomingMark);
        return incomingIndex;
      });
      cachedActiveMarkIndexAndSearchText.current = { activeMarkIndex: -1, searchText: '' };
      return;
    }

    setActiveMarkIndex(() => {
      const firstMarkIndex = 0;
      const viewportMarkIndex = newMarks.findIndex((mark) => isInViewport(mark));
      const closestMarkIndex = viewportMarkIndex > -1 ? viewportMarkIndex : firstMarkIndex;

      // Find the mark directly in the window viewport
      const closestMark = newMarks[closestMarkIndex];

      focusIncomingMark(closestMark);

      return closestMarkIndex;
    });
  }, []);

  // Input keybindings
  const { keyBindingTargetRef } = useKeybindings<HTMLInputElement>([
    {
      keys: ['enter'],
      handler: handleNextMark,
    },
    {
      keys: ['shift+enter'],
      handler: handlePreviousMark,
    },
  ]);

  const openFinder = useCallback(() => {
    setIsVisible(true);
    setSearchText(input);
    setTimeout(() => {
      keyBindingTargetRef.current?.select();
    }, 0);
  }, [input, keyBindingTargetRef]);

  const closeFinder = useCallback(() => {
    cachedActiveMarkIndexAndSearchText.current = { activeMarkIndex, searchText };
    clearHighlights(marks);
    setMarks([]);
    setActiveMarkIndex(-1);
    setSearchText('');
    setIsVisible(false);
  }, [activeMarkIndex, marks, searchText]);

  // Global keybindings
  useKeybindings([
    {
      keys: ['shift+f'],
      handler: openFinder,
      preventDefault: true,
    },
    {
      keys: ['escape'],
      handler: closeFinder,
      preventDefault: true,
    },
  ]);

  // On search text or options change, highlight the text
  useEffect(() => {
    let newMarks: HTMLElement[] = [];

    setMarks((prevMarks) => {
      clearHighlights(prevMarks);
      const _newMarks = highlightText(searchText, options);
      newMarks = _newMarks;
      return _newMarks;
    });

    setTimeout(() => {
      handleClosestMark(newMarks, searchText);
    }, 0);
  }, [searchText, options, handleClosestMark]);

  return (
    <div
      className={`deepfinder-container bg-white text-black flex items-center gap-1 border-[0.06rem] border-gray-200 rounded-[0.25rem] shadow-lg p-1 pr-1.5 fixed top-4 right-4 transition-transform ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-[200%]'
      }`}>
      {/* Search input */}
      <div className="flex items-center gap-[0.15rem] border px-1 rounded-[0.18rem] focus-within:border-blue-500">
        <input
          className="w-full h-6 text-[0.8rem] focus:outline-none"
          onChange={handleSearchTextChange}
          placeholder="Enter search text..."
          ref={keyBindingTargetRef}
          type="text"
          value={searchText}
        />
        <button
          className={`w-[1.3rem] h-[1.3rem] min-w-[1.3rem] min-h-[1.3rem] text-[0.65rem] font-normal rounded-sm select-none hover:bg-gray-200 ${options.preserveCase ? 'bg-gray-300' : ''}`}
          aria-label="Preserve Case"
          onClick={() => searchOptionsStorage.toggleOption('preserveCase')}
          title="Preserve Case">
          Aa
        </button>
        <button
          className={`w-[1.3rem] h-[1.3rem] min-w-[1.3rem] min-h-[1.3rem] text-[0.65rem] font-normal rounded-sm select-none hover:bg-gray-200 ${options.wholeWord ? 'bg-gray-300' : ''}`}
          aria-label="Whole Word"
          onClick={() => searchOptionsStorage.toggleOption('wholeWord')}
          title="Whole Word">
          [ab]
        </button>
        <button
          className={`w-[1.3rem] h-[1.3rem] min-w-[1.3rem] min-h-[1.3rem] text-[0.65rem] font-normal rounded-sm select-none hover:bg-gray-200 ${options.useRegex ? 'bg-gray-300' : ''}`}
          aria-label="Regex"
          onClick={() => searchOptionsStorage.toggleOption('useRegex')}
          title="Regex">
          .*
        </button>
        <button
          className={`w-[1.3rem] h-[1.3rem] min-w-[1.3rem] min-h-[1.3rem] text-[0.65rem] font-normal whitespace-nowrap rounded-sm rotate-90 select-none hover:bg-gray-200 ${options.onlyViewport ? 'bg-gray-300' : ''}`}
          aria-label="Viewport Only"
          onClick={() => searchOptionsStorage.toggleOption('onlyViewport')}
          title="Viewport Only">
          |⇔|
        </button>
      </div>

      {/* Marks pagination */}
      <div className="w-[4.5rem] text-xs text-gray-500 select-none">
        {activeMarkIndex > -1 ? ` ${activeMarkIndex + 1} of ${marks.length}` : 'No matches'}
      </div>

      {/* Previous and Next buttons */}
      <div className="flex items-center gap-1">
        <button
          aria-label="Previous Match"
          className="w-[1.3rem] h-[1.3rem] min-w-[1.3rem] min-h-[1.3rem] font-light flex items-center justify-center rounded-sm select-none hover:bg-gray-200 disabled:bg-transparent disabled:opacity-50 disabled:cursor-default"
          disabled={!marks.length}
          onClick={handlePreviousMark}
          title="Previous Match (Shift+Enter)">
          ↑
        </button>
        <button
          aria-label="Next Match"
          className="w-[1.3rem] h-[1.3rem] min-w-[1.3rem] min-h-[1.3rem] font-light flex items-center justify-center rounded-sm select-none hover:bg-gray-200 disabled:bg-transparent disabled:opacity-50 disabled:cursor-default"
          disabled={!marks.length}
          onClick={handleNextMark}
          title="Next Match (Enter)">
          ↓
        </button>
      </div>

      {/* Close Finder */}
      <button
        onClick={closeFinder}
        className="w-6 h-6 min-w-6 min-h-6 text-[1.5rem] text-red-500 flex items-center justify-center pb-1 select-none overflow-hidden">
        ×
      </button>
    </div>
  );
}
