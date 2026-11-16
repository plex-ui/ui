"use client";

import { useId, useRef, useState } from "react";
import { PageControl } from "@plexui/ui/components/PageControl";
import { DemoControlRow, Segments, controlsTableStyle } from "./ButtonDemos";
import { SliderValueControl } from "./SliderValueControl";

const BACKGROUNDS = ["automatic", "prominent", "minimal"] as const;

/**
 * The Overview, one carousel with every setting: what the page once showed one by one (Many pages, Background) are
 * its settings (owner 11.11). From seven pages the dots shrink past a window around the current page.
 */
export function PageControlOverviewDemo() {
  const pagesId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(5);
  const [background, setBackground] =
    useState<(typeof BACKGROUNDS)[number]>("automatic");
  const [current, setPage] = useState(0);
  // Fewer pages than the page shown: the last one is, as the scroller clamps to it
  const page = Math.min(current, count - 1);
  const pages = Array.from({ length: count }, (_, index) => index + 1);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="pages">
          <SliderValueControl
            ariaLabel="pages"
            min={2}
            max={12}
            step={1}
            value={count}
            onChange={setCount}
            width="min(42vw, 340px)"
          />
        </DemoControlRow>
        <Segments
          name="background"
          options={BACKGROUNDS}
          value={background}
          onChange={setBackground}
        />
      </div>
      <div
        data-demo-stage
        className="flex-1 flex items-center justify-center py-10 w-full"
      >
        <div className="flex w-full max-w-[320px] flex-col items-center gap-3">
          <div
            id={pagesId}
            ref={scroller}
            className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto rounded-2xl bg-[var(--color-surface-secondary)] [scrollbar-width:none]"
            onScroll={(event) =>
              setPage(
                Math.round(
                  event.currentTarget.scrollLeft /
                    event.currentTarget.clientWidth,
                ),
              )
            }
          >
            {pages.map((number) => (
              <div
                key={number}
                className="flex h-40 w-full shrink-0 snap-center items-center justify-center text-2xl font-semibold tabular-nums"
              >
                {number}
              </div>
            ))}
          </div>
          <PageControl
            count={count}
            value={page}
            background={background}
            aria-controls={pagesId}
            onChange={(index, { scrubbing }) => {
              setPage(index);
              const element = scroller.current;
              element?.scrollTo({
                left: index * element.clientWidth,
                behavior: scrubbing ? "instant" : "auto",
              });
            }}
          />
        </div>
      </div>
    </>
  );
}
