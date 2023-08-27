import { useRef } from "react";
import {
  DndContext,
  useDndContext,
  useDndMonitor,
  DragEndEvent,
} from "@dnd-kit/core";

import { Props } from "@dnd-kit/core/dist/components/DndContext/DndContext";

/**
 * Wrap a dnd-kit DndContext with a position monitor to get the
 * active drag element on drag end
 * TODO: use look into fixing this upstream
 * Related: https://github.com/clauderic/dnd-kit/issues/238
 */

type DragEndWithOverlayEvent = {
  dragOverlayClientRect?: DOMRect;
};

export type CustomDragEndEvent = DragEndWithOverlayEvent & DragEndEvent;

type CustomDragProps = {
  onDragEnd?: (event: CustomDragEndEvent) => void;
};

function DragPositionMonitor({ onDragEnd }: CustomDragProps) {
  const { dragOverlay } = useDndContext();

  const dragOverlayClientRectRef = useRef<DOMRect>();
  function handleDragMove() {
    if (dragOverlay?.nodeRef?.current) {
      dragOverlayClientRectRef.current =
        dragOverlay.nodeRef.current.getBoundingClientRect();
    }
  }

  function handleDragEnd(props: DragEndEvent) {
    onDragEnd &&
      onDragEnd({
        ...props,
        dragOverlayClientRect: dragOverlayClientRectRef.current,
      });
  }
  useDndMonitor({ onDragEnd: handleDragEnd, onDragMove: handleDragMove });

  return null;
}

/**
 * @param {CustomDragProps} props
 */
function DragContext({
  children,
  onDragEnd,
  ...props
}: CustomDragProps & Props) {
  return (
    <DndContext {...props}>
      <DragPositionMonitor onDragEnd={onDragEnd} />
      {children}
    </DndContext>
  );
}

export default DragContext;
