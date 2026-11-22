// Metro for the example: the app imports @plexui/react-native from the package around it and @plexui/styles from
// the repo, and every dependency comes from its own node_modules. The repo root (the docs site, another React) is
// not a watch folder, so Metro never sees its node_modules; the package's sources find theirs through
// nodeModulesPaths.
const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")

const projectRoot = __dirname
const packageRoot = path.resolve(projectRoot, "..")
const stylesRoot = path.resolve(projectRoot, "../../styles")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [packageRoot, stylesRoot]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")]
config.resolver.extraNodeModules = {
  "@plexui/react-native": packageRoot,
  "@plexui/styles": stylesRoot,
}
const escape = (dir) => dir.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")
config.resolver.blockList = [
  new RegExp(`^${escape(stylesRoot)}/node_modules/.*`),
  new RegExp(`^${escape(packageRoot)}/dist/.*`),
  new RegExp(`^${escape(projectRoot)}/(dist|test-results|playwright-report)/.*`),
]

// The package ships its TypeScript source to React Native (the "react-native" condition of its exports) and
// compiled JS to everything else. In this repo there is no build: the web bundle takes the source too.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && (moduleName === "@plexui/react-native" || moduleName.startsWith("@plexui/react-native/"))) {
    const conditions = [...(context.unstable_conditionNames ?? []), "react-native"]
    return context.resolveRequest({ ...context, unstable_conditionNames: conditions, unstable_conditionsByPlatform: { web: conditions } }, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
