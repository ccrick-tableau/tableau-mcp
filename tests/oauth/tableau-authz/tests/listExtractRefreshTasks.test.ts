import { z } from 'zod';

import { extractRefreshTaskSchema } from '../../../../src/sdks/tableau/types/extractRefreshTask.js';
import { expect, test } from './base.js';

test.describe('list-extract-refresh-tasks', () => {
  test('list extract refresh tasks', async ({ client }) => {
    const tasks = await client.callTool('list-extract-refresh-tasks', {
      schema: z.array(extractRefreshTaskSchema),
      toolArgs: {},
    });

    expect(Array.isArray(tasks)).toBe(true);
  });
});
