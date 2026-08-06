import axe from 'axe-core';
import { expect } from 'vitest';

export async function expectNoA11yViolations(container: Element) {
  const result = await axe.run(container, {
    rules: {
      // jsdom does not compute real rendered contrast. Browser/manual checks cover this.
      'color-contrast': { enabled: false },
    },
  });

  expect(result.violations).toEqual([]);
}
