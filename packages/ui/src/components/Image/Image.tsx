"use client"

import clsx from "clsx"
import { type ComponentProps, useState } from "react"
import s from "@plexui/styles/components/Image/Image.module.css"

const loadedSrcs = new Set<string>()

export const Image = ({
  src,
  className,
  draggable = false,
  onLoad,
  onError,
  forceRenderAfterLoadFail = false,
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

  if (!src || (!forceRenderAfterLoadFail && failed)) {
    return null
  }

  return (
    <img
      {...restProps}
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
