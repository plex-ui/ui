import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// React Compiler diagnostics from eslint-plugin-react-hooks v7, adopted
// incrementally (https://react.dev/reference/eslint-plugin-react-hooks).
// They stay errors everywhere except in the files below, which predate the
// plugin (mostly code inherited from apps-sdk-ui: latest-ref hooks,
// TransitionGroup, mount-time state sync). Shrink this list as files are
// rewritten; do not add new files to it.
const compilerRules = [
  "react-hooks/set-state-in-effect",
  "react-hooks/refs",
  "react-hooks/immutability",
  "react-hooks/purity",
  "react-hooks/static-components",
];
const compilerAdoptionBacklog = [
  "app/(home)/_components/ComponentShowcase.tsx",
  "components/docs/AvatarIconDemo.tsx",
  "components/docs/DocsPageWithMobileTOC.tsx",
  "components/docs/IconBrowser/IconBrowser.tsx",
  "components/docs/SliderDemos.tsx",
  "components/layout/SidebarSearch.tsx",
  "packages/ui/src/components/Alert/Alert.tsx",
  // useLinkComponent() returns a component from context, which
  // static-components reads as one created during render
  "packages/ui/src/components/Card/Card.tsx",
  "packages/ui/src/components/FloatingLabelInput/FloatingLabelInput.tsx",
  "packages/ui/src/components/MarkdownEditor/MarkdownEditor.tsx",
  "packages/ui/src/components/OTPInput/OTPInput.tsx",
  "packages/ui/src/components/ProgressSteps/ProgressSteps.tsx",
  "packages/ui/src/components/ShimmerText/ShimmerText.tsx",
  "packages/ui/src/components/Toast/Toaster.tsx",
  "packages/ui/src/components/Transition/SlotTransitionGroup.tsx",
  "packages/ui/src/components/Transition/TransitionGroup.tsx",
  "packages/ui/src/components/Transition/shared.ts",
  "packages/ui/src/hooks/useCharactersPerSecond.tsx",
  "packages/ui/src/hooks/useIsMounted.tsx",
  "packages/ui/src/hooks/useLatestValue.tsx",
  "packages/ui/src/hooks/usePrevious.tsx",
  "packages/ui/src/hooks/useStableCallback.tsx",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: compilerAdoptionBacklog,
    rules: Object.fromEntries(compilerRules.map((rule) => [rule, "warn"])),
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated, gitignored output: compiled workspace packages and
    // fumadocs-mdx collections.
    "packages/*/dist/**",
    ".source/**",
    // Independent packages with their own package.json and tooling.
    "skills/dev-browser/**",
    "video/**",
  ]),
]);

export default eslintConfig;
