type SearchOptions = {
  preserveCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  onlyViewport: boolean;
};

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
 * If at the top of the page, it will return the first mark
 * @param marks - The array of marks to check
 * @returns The index of the closest mark to the center of the viewport
 */
function getClosestMarkIndex(marks: HTMLElement[]) {
  const firstMarkIndex = 0;

  // Return the first mark if at the top of the page
  if (window.scrollY === 0) return firstMarkIndex;

  // Return the first mark if there are no viewport marks (just double-checking)
  if (!marks.length) return firstMarkIndex;

  // Return the first mark if there are no viewport marks
  const viewportMarks = marks.filter((mark) => isInViewport(mark));
  if (!viewportMarks.length) return firstMarkIndex;

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
      mark.style.backgroundColor = '#ffff00 !important';
      mark.style.color = '#000000 !important';
      mark.setAttribute('style', 'background-color: #ffff00 !important; color: #000000 !important;');
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
    currentMark.style.backgroundColor = '#ffff00 !important';
    currentMark.style.color = '#000000 !important';
    currentMark.setAttribute('style', 'background-color: #ffff00 !important; color: #000000 !important;');
  }

  incomingMark.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  incomingMark.style.backgroundColor = '#fc9636 !important';
  incomingMark.style.color = '#000000 !important';
  incomingMark.setAttribute('style', 'background-color: #fc9636 !important; color: #000000 !important;');
}

export { isInViewport, getClosestMarkIndex, highlightText, clearHighlights, focusIncomingMark };
