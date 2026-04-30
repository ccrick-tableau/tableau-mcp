import z from 'zod';

import { flowSchema } from '../../../src/sdks/tableau/types/flow.js';
import { getDefaultEnv, getSuperstoreFlow, resetEnv, setEnv } from '../../testEnv.js';
import { callTool } from '../client.js';

describe('list-flows', () => {
  beforeAll(setEnv);
  afterAll(resetEnv);

  it('should list flows', async () => {
    const env = getDefaultEnv();
    const superstoreFlow = getSuperstoreFlow(env);

    const flows = await callTool('list-flows', {
      env,
      schema: z.array(flowSchema),
    });

    expect(flows.length).greaterThan(0);
    const flow = flows.find((flow) => flow.name === 'Superstore Flow');

    expect(flow).toMatchObject({
      id: superstoreFlow.id,
      name: 'Superstore Flow',
    });
  });

  it('should list flows with filter', async () => {
    const env = getDefaultEnv();
    const superstoreFlow = getSuperstoreFlow(env);

    const flows = await callTool('list-flows', {
      env,
      schema: z.array(flowSchema),
      toolArgs: { filter: 'name:eq:Superstore Flow' },
    });

    expect(flows.length).greaterThan(0);
    const flow = flows.find((candidate) => candidate.name === 'Superstore Flow');

    expect(flow).toMatchObject({
      id: superstoreFlow.id,
      name: 'Superstore Flow',
    });
  });
});
