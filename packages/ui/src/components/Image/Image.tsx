"use client"

import clsx from "clsx"
import { type ComponentProps, useState } from "react"
import { mergeRefs } from "react-merge-refs"
import s from "@plexui/styles/components/Image/Image.module.css"

const loadedSrcs = new Set<string>()

export const Image = ({
  src,
  className,
  draggable = false,
  onLoad,
  onError,
  forceRenderAfterLoadFail = false,
  ref,
  ...restProps
}: ComponentProps<"img"> & {
  /** Force the image tag to be placed in the DOM even if load failed (resulting in broken image display) */
  forceRenderAfterLoadFail?: boolean
}) => {
  // Track load/fail per src so a new src starts fresh after an error
  const [loadedSrc, setLoadedSrc] = useState<string>()
  const [failedSrc, setFailedSrc] = useState<string>()
  const loaded = !!src && (loadedSrc === src || loadedSrcs.has(src))
  const failed = !!src && failedSrc === src
  const considerLoaded = loaded || (failed && forceRenderAfterLoadFail)

  // An image that loaded before hydration fired its load event before React
  // listened for it, and React does not replay it: read the element instead
  const markLoadedIfComplete = (img: HTMLImageElement | null) => {
    if (img && src && !loaded && img.complete && img.naturalWidth > 0) {
      setLoadedSrc(src)
      loadedSrcs.add(src)
    }
  }

  if (!src || (!forceRenderAfterLoadFail && failed)) {
    return null
  }

  return (
    <img
      {...restProps}
      ref={mergeRefs([ref, markLoadedIfComplete])}
      src={src}
      className={clsx(s.Image, className)}
      onLoad={(evt) => {
        setLoadedSrc(src)
        loadedSrcs.add(src)
        onLoad?.(evt)
      }}
      onError={(evt) => {
        setFailedSrc(src)
        onError?.(evt)
      }}
      data-loaded={considerLoaded ? "" : undefined}
      draggable={draggable}
    />
  )
}
