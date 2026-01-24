# Figma Plugin

This is a Figma plugin for working with Plex UI. The plugin allows you to generate documentation, components, and icons from Figma.

## Installation and Setup

### Requirements

- Node.js (download from: https://nodejs.org/en/download/)
- TypeScript (install globally: `npm install -g typescript`)

### Install Dependencies

```bash
npm install
```

This will install the necessary dependencies, including types for Figma Plugin API (`@figma/plugin-typings`).

### Build

To compile TypeScript to JavaScript:

```bash
npm run build
```

### Development Mode (Watch)

For automatic recompilation when files change:

```bash
npm run watch
```

### Using with Visual Studio Code

1. Open the plugin folder in Visual Studio Code
2. Run build task: `Terminal > Run Build Task...` → select `npm: watch`
3. Visual Studio Code will automatically recompile JavaScript on every save

## Additional Information

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/plugin-quickstart-guide/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
