import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Loader from './Loader';

describe('Loader', () => {
  it('renders Loader component', () => {
    const { container } = render(<Loader />);
    const loader = container.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('renders fullscreen layout when isFullscreen is true', () => {
    const { container } = render(<Loader isFullscreen />);
    const wrapper = container.firstChild;

    expect(wrapper).toBeInstanceOf(HTMLDivElement);
    expect(wrapper).toHaveClass('fixed');
    expect(wrapper).toHaveClass('top-1/2');
    expect(wrapper).toHaveClass('-translate-x-1/2');
  });

  it('renders centered flex layout when isFullscreen is false', () => {
    const { container } = render(<Loader />);
    const wrapper = container.firstChild;

    expect(wrapper).toBeInstanceOf(HTMLDivElement);
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });
});
