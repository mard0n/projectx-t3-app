import type { Updates } from "..";

export const throttle = (
  fn: (updates: Updates, updatesRef: React.MutableRefObject<Updates>) => void,
  wait = 300,
) => {
  let inThrottle: boolean,
    lastFn: ReturnType<typeof setTimeout>,
    lastTime: number;

  return function (args: Updates, updatesRef: React.MutableRefObject<Updates>) {
    if (!inThrottle) {
      fn(args, updatesRef);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(
        () => {
          if (Date.now() - lastTime >= wait) {
            fn(args, updatesRef);
            lastTime = Date.now();
          }
        },
        Math.max(wait - (Date.now() - lastTime), 0),
      );
    }
  };
};
