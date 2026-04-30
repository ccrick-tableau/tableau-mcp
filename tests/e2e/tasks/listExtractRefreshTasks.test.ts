import z from 'zod';

import { extractRefreshTaskSchema } from '../../../src/sdks/tableau/types/extractRefreshTask.js';
import { getDefaultEnv, resetEnv, setEnv } from '../../testEnv.js';
import { callTool } from '../client.js';

describe('list-extract-refresh-tasks', () => {
  beforeAll(setEnv);
  afterAll(resetEnv);

  it('should list extract refresh tasks', async () => {
    const env = getDefaultEnv();

    const tasks = await callTool('list-extract-refresh-tasks', {
      env,
      schema: z.array(extractRefreshTaskSchema),
    });

    // The test site may or may not have extract refresh tasks configured.
    // We only assert the response is a well-formed array; presence of
    // specific tasks is the business of a dedicated fixture in tests/constants.ts
    // if the maintainers later want to assert on specific task ids.
    expect(Array.isArray(tasks)).toBe(true);
  });
});
