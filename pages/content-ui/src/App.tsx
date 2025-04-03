import { useState, useCallback, useEffect } from 'react';

function isInViewport(element: HTMLElement | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
}

function highlightText(text: string, options: SearchOptions): HTMLElement[] {
  if (!text.trim()) return [];

  let searchText = text;
  let flags = 'g';

  // Apply search options
  if (options.useRegex) {
    // Use as is for regex
  } else {
    // Escape special regex characters if not using regex mode
    searchText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Apply whole word option
    if (options.wholeWord) {
      searchText = `\\b${searchText}\\b`;
    }
  }

  // Case sensitivity
  if (!options.preserveCase) {
    flags += 'i';
  }

  const regex = new RegExp(searchText, flags);

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
    if (parent?.tagName === 'MARK' || parent?.closest('.p-4.bg-white.rounded-lg')) continue;

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
    mark.style.backgroundColor = 'yellow';
    mark.style.color = 'black';
    try {
      range.surroundContents(mark);
      newMarks.unshift(mark);
    } catch (e) {
      // Skip if can't surround (happens with partial node selections)
      console.log("Couldn't highlight:", e);
    }
  }

  return newMarks;
}

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

type SearchOptions = {
  preserveCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  onlyViewport: boolean;
};

export default function App() {
  // Search text
  const [searchText, setSearchText] = useState('');

  // Options
  const [options, setOptions] = useState<SearchOptions>({
    preserveCase: false,
    wholeWord: false,
    useRegex: false,
    onlyViewport: false,
  });

  // Marked elements
  const [marks, setMarks] = useState<HTMLElement[]>([]);
  const [activeMark, setActiveMark] = useState(-1);

  const handleSearchTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  useEffect(() => {
    let newMarksCount = 0;

    setMarks((prevMarks) => {
      const newMarks = highlightText(searchText, options);
      clearHighlights(prevMarks);
      newMarksCount = newMarks.length;
      return newMarks;
    });

    setActiveMark(() => (newMarksCount > 0 ? 0 : -1));
  }, [searchText, options]);

  return (
    <div className="bg-white text-black flex items-center gap-1 border-[0.06rem] border-gray-200 rounded-[0.25rem] shadow-lg p-1 pr-1.5 fixed top-4 right-4">
      <div className="flex items-center gap-[0.15rem] border px-1 rounded-[0.18rem] focus-within:border-blue-500">
        <input
          type="text"
          placeholder="Enter search text..."
          value={searchText}
          onChange={handleSearchTextChange}
          className="w-full h-7 text-[0.9rem] focus:outline-none"
        />
        <button
          className={`w-6 h-6 min-w-6 min-h-6 text-xs rounded-sm ${options.preserveCase ? 'bg-gray-200' : ''}`}
          aria-label="Preserve Case"
          onClick={() => setOptions((prev) => ({ ...prev, preserveCase: !prev.preserveCase }))}>
          Aa
        </button>
        <button
          className={`w-6 h-6 min-w-6 min-h-6 text-xs rounded-sm ${options.wholeWord ? 'bg-gray-200' : ''}`}
          aria-label="Whole Word"
          onClick={() => setOptions((prev) => ({ ...prev, wholeWord: !prev.wholeWord }))}>
          [ab]
        </button>
        <button
          className={`w-6 h-6 min-w-6 min-h-6 text-xs rounded-sm ${options.useRegex ? 'bg-gray-200' : ''}`}
          aria-label="Regex"
          onClick={() => setOptions((prev) => ({ ...prev, useRegex: !prev.useRegex }))}>
          .*
        </button>
        <button
          className={`w-6 h-6 min-w-6 min-h-6 text-xs whitespace-nowrap rounded-sm rotate-90 ${options.onlyViewport ? 'bg-gray-200' : ''}`}
          aria-label="Viewport Only"
          onClick={() => setOptions((prev) => ({ ...prev, onlyViewport: !prev.onlyViewport }))}>
          |⇔|
        </button>
      </div>
      <div className="w-[4.5rem] text-xs text-gray-500">
        {activeMark > -1 ? ` ${activeMark + 1} of ${marks.length}` : 'No matches'}
      </div>
      <button
        onClick={() => {
          clearHighlights(marks);
        }}
        className="w-6 h-6 min-w-6 min-h-6 text-red-500 flex items-center justify-center">
        <span className="w-4 h-4 min-w-4 min-h-4 text-[1.5rem] rotate-45 inline-flex items-center justify-center -mt-[0.24rem] -mr-[0.26rem]">
          +
        </span>
      </button>
    </div>
  );
}
