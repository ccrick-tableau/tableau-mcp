import { z } from 'zod';

import { scheduleSchema } from '../../../../src/sdks/tableau/types/schedule.js';
import { expect, test } from './base.js';

test.describe('list-schedules', () => {
  test('list schedules', async ({ client }) => {
    const schedules = await client.callTool('list-schedules', {
      schema: z.array(scheduleSchema),
      toolArgs: {},
    });

    expect(Array.isArray(schedules)).toBe(true);
  });
});
