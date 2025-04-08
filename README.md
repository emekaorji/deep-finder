# Deep Finder

![Deep Finder Logo](https://res.cloudinary.com/coderabbi/image/upload/v1743904629/deep-finder/deep-finder-logo-large_shsj48.png)

![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)

![GitHub action badge](https://github.com/emekaorji/deep-finder/actions/workflows/build-zip.yml/badge.svg)
![GitHub action badge](https://github.com/emekaorji/deep-finder/actions/workflows/lint.yml/badge.svg)
![GitHub action badge](https://github.com/emekaorji/deep-finder/actions/workflows/codeql.yml/badge.svg)

A powerful Chrome extension that enhances in-page search capabilities beyond the browser's default find functionality.

## Features

Deep Finder provides an advanced set of search capabilities that go well beyond the default browser search:

- **Case Sensitivity**: Preserve case while searching for precise matches
- **Whole Word Matching**: Find only complete words, not partial matches
- **Regex Support**: Use regular expressions for complex search patterns
- **Viewport-Only Search**: Limit search to just the visible portion of the page
- **Intuitive Navigation**: Quickly move between search results
- **Keyboard Shortcuts**: Efficiently search without losing your flow

<img src="https://res.cloudinary.com/coderabbi/image/upload/v1744066253/deep-finder/deep-finder-demo-fast_ndfesw.gif" alt="Deep Finder in action" width="100%">

## Installation

Deep Finder is available on the Chrome Web Store:

1. Visit [Deep Finder on Chrome Web Store](#) (Link coming soon)
2. Click "Add to Chrome"
3. Confirm the installation

## How to Use

### Opening the Search

- Click the Deep Finder icon in your browser toolbar
- **OR** use the keyboard shortcut: `Shift+F`

### Search Options

Deep Finder's intuitive interface provides easy access to all search options:

- **Aa**: Toggle case sensitivity
- **[ab]**: Match whole words only
- **.***: Use regular expressions
- **|⇔|**: Search only in the current viewport

![Deep Finder search options](https://res.cloudinary.com/coderabbi/image/upload/v1744067548/deep-finder/deep-finder-search-options_j8ddww.png)

### Keyboard Shortcuts

- `Shift+F`: Open Deep Finder
- `Escape`: Close Deep Finder
- `Enter`: Navigate to next match
- `Shift+Enter`: Navigate to previous match

### Result Navigation

Deep Finder highlights all matches and clearly indicates which result you're currently viewing, with a count of total matches found.

Use the arrow buttons or keyboard shortcuts to navigate between matches.

![Deep Finder navigation](https://res.cloudinary.com/coderabbi/image/upload/v1744067654/deep-finder/deep-finder-navigation_fwrkk7.png)

## Coming Soon

Looking to improve Deep Finder with the following features:

- Fuzzy searching capabilities
- One-click highlighting of all emails on a page
- One-click highlighting of all phone numbers on a page
- One-click highlighting of all URLs on a page

## For Developers

### Project Structure

The entry point for the content script UI is located at `./pages/content-ui/src/App.tsx`.

### Development Setup

For detailed instructions on setting up the development environment and building the extension from source, please refer to [BOILERPLATE.md](./BOILERPLATE.md).

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue.

## License

[MIT License](./LICENSE)
