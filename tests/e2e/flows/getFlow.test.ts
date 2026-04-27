import { flowSchema } from '../../../src/sdks/tableau/types/flow.js';
import { getDefaultEnv, getSuperstoreFlow, resetEnv, setEnv } from '../../testEnv.js';
import { callTool } from '../client.js';

describe('get-flow', () => {
  beforeAll(setEnv);
  afterAll(resetEnv);

  it('should get flow', async () => {
    const env = getDefaultEnv();
    const superstoreFlow = getSuperstoreFlow(env);

    const flow = await callTool('get-flow', {
      env,
      schema: flowSchema,
      toolArgs: { flowId: superstoreFlow.id },
    });

    expect(flow).toMatchObject({
      id: superstoreFlow.id,
      name: 'Superstore Flow',
    });
  });
});
