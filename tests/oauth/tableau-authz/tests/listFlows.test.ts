import { z } from 'zod';

import { flowSchema } from '../../../../src/sdks/tableau/types/flow.js';
import { expect, test } from './base.js';

test.describe('list-flows', () => {
  test('list flows', async ({ client }) => {
    const flows = await client.callTool('list-flows', {
      schema: z.array(flowSchema),
      toolArgs: {},
    });

    expect(Array.isArray(flows)).toBe(true);
  });
});
