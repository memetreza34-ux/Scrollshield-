import { describe, expect, it } from 'vitest';
import { createSerialTaskQueue } from './nativeSyncQueue';

describe('native protection sync queue', () => {
  it('does not apply an updated rule snapshot before the previous write completes', async () => {
    let finishFirst!: () => void;
    const firstFinished = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const events: string[] = [];
    const queue = createSerialTaskQueue(async (snapshot: number) => {
      events.push(`start:${snapshot}`);
      if (snapshot === 1) await firstFinished;
      events.push(`finish:${snapshot}`);
    });

    const oldSnapshot = queue(1);
    const newSnapshot = queue(2);
    await Promise.resolve();
    expect(events).toEqual(['start:1']);
    finishFirst();
    await Promise.all([oldSnapshot, newSnapshot]);
    expect(events).toEqual(['start:1', 'finish:1', 'start:2', 'finish:2']);
  });

  it('applies a rapid protection-off command last', async () => {
    const applied: boolean[] = [];
    const queue = createSerialTaskQueue(async (enabled: boolean) => {
      await Promise.resolve();
      applied.push(enabled);
    });

    await Promise.all([queue(true), queue(true), queue(false)]);
    expect(applied).toEqual([true, true, false]);
    expect(applied.at(-1)).toBe(false);
  });

  it('recovers from a rejected native bridge call without dropping later changes', async () => {
    const applied: number[] = [];
    const queue = createSerialTaskQueue(async (snapshot: number) => {
      applied.push(snapshot);
      if (snapshot === 1) throw new Error('permission unavailable');
    });

    const first = queue(1);
    const second = queue(2);
    await expect(first).rejects.toThrow('permission unavailable');
    await expect(second).resolves.toBeUndefined();
    expect(applied).toEqual([1, 2]);
  });
});
