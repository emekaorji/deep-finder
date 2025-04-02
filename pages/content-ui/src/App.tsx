import { useState, useCallback, useEffect } from 'react';

function isInViewport(element: HTMLElement | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
}

function isInUserSelection(node: Text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  return range.intersectsNode(node);
}

export default function App() {
  // Search text
  const [searchText, setSearchText] = useState('');

  // Options
  const [options, setOptions] = useState({
    preserveCase: false,
    wholeWord: false,
    useRegex: false,
    onlyViewport: false,
    onlySelection: false,
  });

  // Marked elements
  const [marks, setMarks] = useState<HTMLElement[]>([]);
  const [activeMark, setActiveMark] = useState<HTMLElement | null>(null);

  const scrollToFirstHighlight = useCallback(() => {
    if (marks.length > 0) {
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveMark(marks[0]);
    }
  }, [marks]);

  const clearHighlights = useCallback(() => {
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        // Replace the mark with its text content
        const textNode = document.createTextNode(mark.textContent || '');
        parent.replaceChild(textNode, mark);
        // Normalize to merge adjacent text nodes
        parent.normalize();
      }
    });
    setMarks([]);
    setActiveMark(null);
  }, [marks]);

  const highlightText = useCallback(
    (text: string) => {
      clearHighlights();
      if (!text.trim()) return;

      let searchText = text;
      let flags = '';

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
        acceptNode: node => {
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

          // Check selection limitation
          if (options.onlySelection && !isInUserSelection(node as Text)) {
            return NodeFilter.FILTER_SKIP;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const matches: Range[] = [];
      const newMarks: HTMLElement[] = [];

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;

        // Skip if already highlighted or within our search UI
        if (parent?.tagName === 'MARK' || parent?.closest('.p-4.bg-white.rounded-lg')) continue;

        const nodeValue = node.nodeValue || '';
        const match = nodeValue.match(regex);

        if (match && match.index !== undefined) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          matches.push(range);
        }
      }

      // Apply highlights in reverse order to avoid affecting positions
      for (let i = matches.length - 1; i >= 0; i--) {
        const range = matches[i];
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

      setMarks(newMarks);
      if (newMarks.length > 0) {
        setActiveMark(newMarks[0]);
      }
    },
    [clearHighlights, options],
  );

  const [selectionWrapper, setSelectionWrapper] = useState<HTMLElement | null>(null);

  const removeSelectionWrapper = useCallback(() => {
    console.log('removing selection wrapper', selectionWrapper);
    if (selectionWrapper) {
      const parent = selectionWrapper.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(selectionWrapper.textContent || ''), selectionWrapper);
      }
      setSelectionWrapper(null);
    }
  }, [selectionWrapper]);

  const clearSelectionAndInput = useCallback(() => {
    removeSelectionWrapper();
    setSearchText('');
  }, [removeSelectionWrapper]);

  const handleSelectionChange = useCallback(
    (event: Event) => {
      console.log('selectionchange', selectionWrapper, event);
      if (selectionWrapper) {
        removeSelectionWrapper();
      }
    },
    [removeSelectionWrapper, selectionWrapper],
  );

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const wrapSelection = useCallback(() => {
    removeSelectionWrapper();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.toString().trim() === '') return;

    const span = document.createElement('span');
    span.style.backgroundColor = 'red'; // Mild highlight color
    span.style.borderRadius = '3px';
    span.style.padding = '1px';
    span.classList.add('selection-highlight');

    setSelectionWrapper(span);
    range.surroundContents(span);
  }, [removeSelectionWrapper]);

  const handleSearchTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
      highlightText(e.target.value);
    },
    [highlightText],
  );

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200 w-96 text-black fixed top-8 right-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">
          Highlight Text{marks.length > 0 && activeMark ? ` (${marks.indexOf(activeMark) + 1}/${marks.length})` : ''}
        </h2>
        <button
          onClick={() => {
            clearHighlights();
            clearSelectionAndInput();
          }}
          className="text-red-500">
          Clear
        </button>
      </div>
      <input
        type="text"
        placeholder="Enter search text..."
        value={searchText}
        onChange={handleSearchTextChange}
        className="border p-2 w-full mb-2"
        onFocus={wrapSelection}
      />
      <div className="flex gap-2">
        <label>
          <input
            type="checkbox"
            checked={options.preserveCase}
            onChange={() => setOptions(prev => ({ ...prev, preserveCase: !prev.preserveCase }))}
          />{' '}
          Preserve Case
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.wholeWord}
            onChange={() => setOptions(prev => ({ ...prev, wholeWord: !prev.wholeWord }))}
          />{' '}
          Whole Word
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.useRegex}
            onChange={() => setOptions(prev => ({ ...prev, useRegex: !prev.useRegex }))}
          />{' '}
          Use Regex
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.onlyViewport}
            onChange={() => setOptions(prev => ({ ...prev, onlyViewport: !prev.onlyViewport }))}
          />{' '}
          Viewport Only
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.onlySelection}
            onChange={() => setOptions(prev => ({ ...prev, onlySelection: !prev.onlySelection }))}
          />{' '}
          Selection Only
        </label>
      </div>
      <button onClick={scrollToFirstHighlight} className="mt-2 bg-blue-500 text-white p-2">
        Scroll to First
      </button>
    </div>
  );
}
