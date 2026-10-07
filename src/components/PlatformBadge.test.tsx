import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppIconsContext } from '../lib/appIcons';
import { PlatformBadge } from './PlatformBadge';

describe('PlatformBadge', () => {
  it('shows the initials when the device gave no icon', () => {
    const { container } = render(<PlatformBadge label="IG" packages={['com.instagram.android']} />);

    expect(container).toHaveTextContent('IG');
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows the launcher icon of the first installed package', () => {
    const icons = new Map([
      ['com.instagram.lite', 'data:image/png;base64,lite'],
      ['com.instagram.android', 'data:image/png;base64,full'],
    ]);

    const { container } = render(
      <AppIconsContext.Provider value={icons}>
        <PlatformBadge label="IG" packages={['com.instagram.android', 'com.instagram.lite']} />
      </AppIconsContext.Provider>,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,full');
    expect(container).not.toHaveTextContent('IG');
  });

  it('keeps the initials for an app that is not installed', () => {
    const icons = new Map([['com.zhiliaoapp.musically', 'data:image/png;base64,tiktok']]);

    const { container } = render(
      <AppIconsContext.Provider value={icons}>
        <PlatformBadge label="IG" packages={['com.instagram.android']} />
      </AppIconsContext.Provider>,
    );

    expect(container).toHaveTextContent('IG');
    expect(container.querySelector('img')).toBeNull();
  });
});
