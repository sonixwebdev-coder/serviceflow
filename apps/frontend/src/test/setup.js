import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

globalThis.React = React;
HTMLAnchorElement.prototype.click = vi.fn();

afterEach(cleanup);
