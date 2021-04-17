import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { recognizeAxisAndDirection, recognizePageChange } from "./Recognizer";

const sliderWidth = Math.min(document.body.clientWidth, 400);

export default function App() {
  const [imgs] = useState(() => [
    "https://images.unsplash.com/photo-1617932241847-157ae652f7cc?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    "https://images.unsplash.com/photo-1617982370853-a8e5f79be5de?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
    "https://images.unsplash.com/photo-1617989622590-f521f722d8e3?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
  ]);
  return (
    <div style={{ textAlign: "center" }}>
      <Slider imgs={imgs} />
    </div>
  );
}

function Slider(props: SliderPropsType) {
  const { imgs } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  // 补首尾图片
  const appendedImgs = useMemo(() => {
    return [imgs[imgs.length - 1], ...imgs, imgs[0]];
  }, imgs);

  const preventImageDrag = useCallback((e: any) => {
    // 防止浏览器图片拖拽
    e.preventDefault();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const movingState: MovingStateType = {
      timer: -1,
      imgIndex: 1,
      isTouching: false,
      basePos: 0, // translateX 基准位置
      isTransition: false, // 是否正出于过渡效果中
      startEvent: null as null | PointerEvent,
      lastEvent: null as null | PointerEvent,
      axis: null as null | "x" | "y",
      direction: null as null | "left" | "right",
      changeType: 0 as ReturnType<typeof recognizePageChange>,
      range: [Infinity, 0] as [number, number],
    };

    /** 更新 movingState 的最后一次 event，计算移动范围 */
    const updateEventToMovingState = (ev: PointerEvent) => {
      const [xLow, xHigh] = movingState.range;
      movingState.lastEvent = ev;
      movingState.range = [Math.min(xLow, ev.x), Math.max(xHigh, ev.x)];
    };

    const handleStart = (ev: PointerEvent) => {
      // 注意：这里不能去读取 DOM 属性或者根据当前是第几张图来确定起始位置，
      // 因为可能 transition 没有结束，实际位置与 translate 值并不一致
      // 所以要实时读取 DOM 实际位置
      window.clearTimeout(movingState.timer);
      const { x: x1 } = container.parentElement!.getBoundingClientRect();
      const { x: x2 } = container.getBoundingClientRect();

      movingState.basePos = x2 - x1; // 计算出当前 container translateX 的值
      movingState.isTouching = true;
      requestAnimationFrame(() => {
        container.style.transition = "";
        container.style.transform = `translateX(${movingState.basePos}px)`;
      });
      movingState.startEvent = ev;
      updateEventToMovingState(ev);
    };

    const handleMove = (ev: PointerEvent) => {
      if (!movingState.isTouching) return;
      if (!movingState.axis) {
        // 判断拖动轴，在有滚动条的页面下，需要以此区分页面滚动和切换操作
        const axisAndDirection = recognizeAxisAndDirection(
          movingState.startEvent!,
          ev
        );
        if (!axisAndDirection) {
          return;
        }
        movingState.isTransition = true;
        const { axis, direction } = axisAndDirection;
        if (axis === "y") {
          handleEnd(ev);
          return;
        }
        movingState.axis = axis;
        movingState.direction = direction;
      }
      lockTouchActionDirection(true);
      const deltaX = ev.clientX - movingState.startEvent!.clientX;
      if (!movingState.changeType) {
        movingState.changeType = recognizePageChange(
          movingState.startEvent!,
          ev,
          sliderWidth / 2,
          1
        );
      }

      requestAnimationFrame(() => {
        if (!movingState.isTouching) return; // 如果回调的时候已经没有在 moving 手势中，不要执行 transform
        container.style.transform = `translateX(${
          movingState.basePos + deltaX
        }px)`;
      });

      updateEventToMovingState(ev);
    };

    const handleEnd = (ev: PointerEvent) => {
      updateEventToMovingState(ev);
      lockTouchActionDirection(false);
      calcImageIndexAndPlayTransition(movingState, container, appendedImgs);
    };

    const handleCancel = (ev: PointerEvent) => {
      if (movingState.isTransition) {
        return;
      }
      resetMovingState(movingState);
      lockTouchActionDirection(false);
      playTransition(container, sliderWidth, movingState.imgIndex);
    };

    const handleLeave = (ev: PointerEvent) => {
      if (movingState.isTransition && movingState.isTouching) {
        handleEnd(ev);
      }
    };

    const handleTransitionEnd = (ev: TransitionEvent) => {
      if (movingState.isTouching) {
        return;
      }
      startAutoPlay(movingState, container, appendedImgs);
    };

    startAutoPlay(movingState, container, appendedImgs);

    container.addEventListener("pointerdown", handleStart);
    container.addEventListener("pointermove", handleMove, { passive: true });
    container.addEventListener("pointerup", handleEnd);
    container.addEventListener("pointercancel", handleCancel);
    container.addEventListener("pointerleave", handleLeave);
    container.addEventListener("transitionend", handleTransitionEnd);

    return () => {
      lockTouchActionDirection(false);
      container.removeEventListener("pointerdown", handleStart);
      container.removeEventListener("pointermove", handleMove);
      container.removeEventListener("pointerup", handleEnd);
      container.removeEventListener("pointercancel", handleCancel);
      container.addEventListener("pointerleave", handleLeave);
      container.removeEventListener("transitionend", handleTransitionEnd);
      window.clearTimeout(movingState.timer);
    };
  }, [...imgs]);

  return (
    <div className="viewport" style={{ width: sliderWidth }}>
      <div
        ref={containerRef}
        className="container"
        style={{
          width: appendedImgs.length * 100 + "%",
          transform: `translateX(${-sliderWidth}px)`,
        }}
      >
        {appendedImgs.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            style={{ width: sliderWidth, height: "100%" }}
            onPointerDown={preventImageDrag}
          />
        ))}
      </div>
    </div>
  );
}

interface SliderPropsType {
  imgs: string[];
}

interface MovingStateType {
  imgIndex: number;
  timer: number;
  isTouching: boolean;
  basePos: number; // translateX 基准位置
  isTransition: boolean; // 是否正出于过渡效果中
  startEvent: null | PointerEvent;
  lastEvent: null | PointerEvent;
  axis: null | "x" | "y";
  direction: null | "left" | "right";
  changeType: ReturnType<typeof recognizePageChange>;
  range: [number, number];
}

function resetMovingState(movingState: MovingStateType) {
  return Object.assign(movingState, {
    isTouching: false,
    basePos: 0,
    isTransition: false,
    startEvent: null,
    lastEvent: null,
    axis: null,
    direction: null,
    changeType: 0,
    range: [Infinity, 0],
  });
}

function lockTouchActionDirection(lock: boolean) {
  document.body.style.touchAction = !lock ? "" : "pan-x";
}

function playTransition(dom: HTMLElement, width: number, index: number) {
  return requestAnimationFrame(() => {
    dom.style.transition = "transform linear 0.3s";
    dom.style.transform = `translateX(${index * -width}px)`;
  });
}

function calcImageIndexAndPlayTransition(
  movingState: MovingStateType,
  container: HTMLElement,
  appendedImgs: string[],
  ignoreGestureCheck = false
) {
  const {
    range: [xLow, xHigh],
    startEvent,
    lastEvent,
    changeType,
    direction,
  } = movingState;
  if (
    // 校验方向准确性，避免先往左再往右的手势触发反向翻页
    changeType !== 0 &&
    (ignoreGestureCheck ||
      (changeType === (startEvent!.x > lastEvent!.x ? 1 : -1) &&
        ((direction === "left" && xLow - lastEvent!.x >= -16) ||
          (direction === "right" && lastEvent!.x - xHigh >= -16))))
  ) {
    movingState.imgIndex += changeType;
  }

  resetMovingState(movingState);

  if (
    movingState.imgIndex === 0 ||
    movingState.imgIndex === appendedImgs.length - 1
  ) {
    // 如果是移动到补图，我们需要先重置位置
    const imgIndex = movingState.imgIndex;
    movingState.imgIndex = imgIndex === 0 ? appendedImgs.length - 2 : 1;
    const offsetX = (lastEvent?.x ?? 0) - (startEvent?.x ?? 0);
    requestAnimationFrame(() => {
      container.style.transition = "";
      const translateX =
        (movingState.imgIndex + (imgIndex === 0 ? 1 : -1)) * -sliderWidth +
        offsetX;
      container.style.transform = `translateX(${translateX}px)`;
      const finalIndexToPlay = movingState.imgIndex;
      playTransition(container, sliderWidth, finalIndexToPlay);
    });
    return;
  }

  const finalIndexToPlay = movingState.imgIndex;
  playTransition(container, sliderWidth, finalIndexToPlay);
}

function startAutoPlay(
  movingState: MovingStateType,
  container: HTMLElement,
  appendedImgs: string[]
) {
  movingState.isTransition = false;
  movingState.timer = window.setTimeout(() => {
    window.clearTimeout(movingState.timer);
    calcImageIndexAndPlayTransition(
      Object.assign(movingState, {
        changeType: 1,
      }),
      container,
      appendedImgs,
      true
    );
  }, 2000);
}
