/**
 * Test Plugin Fixture
 */
import type { Plugin } from '../../src/shared/types';

export const createTestPlugin = (overrides?: Partial<Plugin>): Plugin => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Plugin',
  version: '1.0.0',
  targetDomains: ['example.com'],
  enabled: true,
  operations: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      type: 'insert',
      description: 'Test insert operation',
      params: {
        selector: 'body',
        position: 'beforeend',
        element: {
          tag: 'div',
          textContent: 'Test',
        },
      },
    },
  ],
  ...overrides,
});
