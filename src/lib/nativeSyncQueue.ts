/**
 * Executes state-changing native bridge commands in the order requested.
 *
 * A React render can trigger a second protection snapshot while a previous
 * Capacitor call is still pending. Without serialization, an older snapshot
 * can complete last and overwrite the new rules, leaving Android out of sync.
 */
export function createSerialTaskQueue<T>(apply: (value: T) => Promise<void>): (value: T) => Promise<void> {
  let tail: Promise<void> = Promise.resolve();

  return (value: T): Promise<void> => {
    const task = tail.then(() => apply(value));
    // A failed native call must not poison the queue for the next snapshot.
    tail = task.catch(() => undefined);
    return task;
  };
}
