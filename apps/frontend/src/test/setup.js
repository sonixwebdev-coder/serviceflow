import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

HTMLAnchorElement.prototype.click = vi.fn();

afterEach(cleanup);
