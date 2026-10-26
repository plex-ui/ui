// reference is needed instead of import so consumer projects can compile properly
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./global.d.ts" />

// The prop contract lives in @plexui/styles so every framework package shares it.
export type * from "@plexui/styles/types"
