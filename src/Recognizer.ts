/**
 * 识别方向
 *
 * @param event1 - 初始 event
 * @param event2 - 最新的 event
 * @param distanceThreshold - 距离到多少开始计算方向
 * @returns - null 表示还未到距离；"x" 水平方向；"y" 垂直方向
 */
export function recognizeAxisAndDirection(
  event1: PointerEvent,
  event2: PointerEvent,
  distanceThreshold: number = 10
): null | { axis: "x" | "y"; direction: "right" | "left" | null } {
  const { distance, axis } = getDistanceFromEvent(event1, event2);
  if (distance < distanceThreshold) {
    return null;
  }
  const dx = event2.x - event1.x;
  return { axis, direction: dx === 0 ? null : dx > 0 ? "right" : "left" };
}

/**
 * 判断往前翻页还是往后翻页
 *
 * @param event1 初始 event
 * @param event2 当前 event
 * @param distanceThreshold - 距离阈值
 * @param velocityInMs - 速度阈值 单位：px/ms
 * @returns
 */
export function recognizePageChange(
  event1: PointerEvent,
  event2: PointerEvent,
  distanceThreshold: number,
  velocityInMs: number = 1
) {
  const { distance } = getDistanceFromEvent(event1, event2);
  const dt = event2.timeStamp - event1.timeStamp;
  const v = distance / dt;

  if ((dt < 500 && velocityInMs <= v) || distanceThreshold <= distance) {
    return event2.x > event1.x ? -1 : 1;
  }
  return 0;
}

function getDistanceFromEvent(event1: PointerEvent, event2: PointerEvent) {
  const { x: x1, y: y1 } = event1;
  const { x: x2, y: y2 } = event2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  return {
    distance: Math.hypot(dx, dy),
    axis: (Math.abs(dx) > Math.abs(dy) ? "x" : "y") as "x" | "y",
  };
}

export function recognizeDirectionChange(
  evt: PointerEvent,
  lastEvent: PointerEvent | null = null,
  direction: null | "left" | "right" = null
) {
  if (lastEvent && direction) {
    const d2 = lastEvent.x > evt.x ? "left" : "right";
    if (d2 !== direction) {
      return true;
    }
  } else if (lastEvent && !direction) {
    direction = lastEvent.x > evt.x ? "left" : "right";
  }
  lastEvent = evt;
  return false;
}
