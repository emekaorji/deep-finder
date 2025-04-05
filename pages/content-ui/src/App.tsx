import { useState, useCallback, useEffect } from 'react';
import { searchInputStorage, searchOptionsStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import useKeybindings from './useKeybindings';

/**
 * Check if the element is in the viewport
 * @param element - The element to check
 * @returns True if the element is in the viewport, false otherwise
 */
function isInViewport(element: HTMLElement | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
}

/**
 * Get the index of the closest mark to the center of the viewport
 * @param marks - The array of marks to check
 * @returns The index of the closest mark to the center of the viewport
 */
function getClosestMarkIndex(marks: HTMLElement[]) {
  const viewportMarks = marks.filter((mark) => isInViewport(mark));

  // sorted from center of viewport to top of viewport to bottom of viewport
  const sortedViewportMarks = viewportMarks.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();

    // Calculate distance from center of viewport
    const viewportCenterY = window.innerHeight / 2;
    const aDistanceFromCenter = Math.abs(aRect.top + aRect.height / 2 - viewportCenterY);
    const bDistanceFromCenter = Math.abs(bRect.top + bRect.height / 2 - viewportCenterY);

    return aDistanceFromCenter - bDistanceFromCenter;
  });

  const firstMarkIndex = 0;
  const viewportMarkIndex = marks.findIndex((mark) => mark === sortedViewportMarks[0]);
  const closestMarkIndex = viewportMarkIndex > -1 ? viewportMarkIndex : firstMarkIndex;
  return closestMarkIndex;
}

/**
 * Highlight the text
 * @param text - The text to highlight
 * @param options - The options for the search
 * @returns The array of marks
 */
function highlightText(text: string, options: SearchOptions): HTMLElement[] {
  if (!text.trim()) return [];

  try {
    let searchText = text;
    let flags = 'g';

    // Escape special regex characters if not using regex mode
    if (!options.useRegex) {
      searchText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Apply whole word option
      if (options.wholeWord) {
        searchText = `\\b${searchText}\\b`;
      }
    }

    // Case insensitivity
    if (!options.preserveCase) {
      flags += 'i';
    }

    const regex = new RegExp(searchText, flags);

    //
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Ignore empty or whitespace-only text nodes
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_SKIP;

        // Skip hidden elements
        const element = node.parentElement;
        if (
          element &&
          (window.getComputedStyle(element).display === 'none' ||
            window.getComputedStyle(element).visibility === 'hidden')
        ) {
          return NodeFilter.FILTER_SKIP;
        }

        // Check viewport limitation
        if (options.onlyViewport && element && !isInViewport(element)) {
          return NodeFilter.FILTER_SKIP;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const matchedRanges: Range[] = [];
    const newMarks: HTMLElement[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;

      // Skip if already highlighted or within our search UI
      if (parent?.tagName === 'MARK' || parent?.closest('.deepfinder-container')) continue;

      const nodeValue = node.nodeValue || '';
      const matches = nodeValue.matchAll(regex);

      for (const match of matches) {
        if (match && match.index !== undefined) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          matchedRanges.push(range);
        }
      }
    }

    // Apply highlights in reverse order to avoid affecting positions
    for (let i = matchedRanges.length - 1; i >= 0; i--) {
      const range = matchedRanges[i];
      const mark = document.createElement('mark');
      mark.style.backgroundColor = '#ffff00';
      mark.style.color = '#000000';
      try {
        range.surroundContents(mark);
        newMarks.unshift(mark);
      } catch {
        // Skip if can't surround (happens with partial node selections)
        // console.log("Couldn't highlight:", e);
      }
    }

    return newMarks;
  } catch {
    return [];
  }
}

/**
 * Clear the highlights
 * @param marks - The array of marks to clear
 */
function clearHighlights(marks: HTMLElement[]) {
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      // Replace the mark with its text content
      const textNode = document.createTextNode(mark.textContent || '');
      parent.replaceChild(textNode, mark);
      // Normalize to merge adjacent text nodes
      parent.normalize();
    }
  });
}

/**
 * Scroll to mark and highlight it
 * @param incomingMark - The incoming mark to focus
 * @param currentMark - The current mark to blur
 */
function focusIncomingMark(incomingMark?: HTMLElement, currentMark?: HTMLElement) {
  if (!incomingMark) return;

  if (currentMark) {
    currentMark.style.backgroundColor = '#ffff00';
  }

  incomingMark.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  incomingMark.style.backgroundColor = '#fc9636';
}

type SearchOptions = {
  preserveCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  onlyViewport: boolean;
};

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

  const handleClosestMark = useCallback((newMarks: HTMLElement[]) => {
    if (!newMarks.length) {
      setActiveMarkIndex(-1);
      return;
    }

    setActiveMarkIndex(() => {
      const closestMarkIndex = getClosestMarkIndex(newMarks);

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
    clearHighlights(marks);
    setMarks([]);
    setActiveMarkIndex(-1);
    setSearchText('');
    setIsVisible(false);
  }, [marks]);

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
      handleClosestMark(newMarks);
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
        className="w-6 h-6 min-w-6 min-h-6 text-[1.5rem] text-red-500 flex items-center justify-center pb-1 select-none">
        ×
      </button>
    </div>
  );
}
