import { useLayoutEffect, useState } from "react";

/* Shrinks a fixed-width "stage" (drawn at a real website width) to the
   width of its frame. The caller owns both refs; this returns the scale
   and the scaled height the frame should take. */
export default function useFitScale(designWidth, frameRef, stageRef) {
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const scale = Math.min(1, frame.clientWidth / designWidth);
      setFit({ scale, height: stage.offsetHeight * scale });
    };
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(stage);
    update();
    return () => observer.disconnect();
  }, [designWidth, frameRef, stageRef]);

  return fit;
}
