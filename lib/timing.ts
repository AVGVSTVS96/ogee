const marks: [string, number][] = [];

export const resetTiming = () => {
  marks.length = 0;
};

export const add = (name: string, ms: number) => {
  marks.push([name, ms]);
};

export const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();

  try {
    return await fn();
  } finally {
    add(name, performance.now() - start);
  }
};

export const serverTiming = () =>
  marks.map(([name, ms]) => `${name};dur=${ms.toFixed(0)}`).join(", ");
