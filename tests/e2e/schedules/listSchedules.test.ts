import z from 'zod';

import { scheduleSchema } from '../../../src/sdks/tableau/types/schedule.js';
import { getDefaultEnv, resetEnv, setEnv } from '../../testEnv.js';
import { callTool } from '../client.js';

describe('list-schedules', () => {
  beforeAll(setEnv);
  afterAll(resetEnv);

  it('should list schedules', async () => {
    const env = getDefaultEnv();

    const schedules = await callTool('list-schedules', {
      env,
      schema: z.array(scheduleSchema),
    });

    // The test site may or may not have schedules configured. We only assert
    // the response is a well-formed array; presence of specific schedules is
    // the business of a dedicated fixture in tests/constants.ts if the
    // maintainers later want to assert on specific schedule ids.
    expect(Array.isArray(schedules)).toBe(true);
  });

  it('should list schedules with a type filter', async () => {
    const env = getDefaultEnv();

    const schedules = await callTool('list-schedules', {
      env,
      schema: z.array(scheduleSchema),
      toolArgs: { filter: 'type:eq:Extract' },
    });

    expect(Array.isArray(schedules)).toBe(true);
    // If any are returned, every one should be of type Extract.
    for (const s of schedules) {
      if (s.type !== undefined) {
        expect(s.type).toBe('Extract');
      }
    }
  });
});
