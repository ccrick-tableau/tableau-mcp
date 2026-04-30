import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { getCreateScheduleTool } from './createSchedule.js';
import { mockSchedule, mockSchedule2 } from './mockSchedule.js';

const mocks = vi.hoisted(() => ({
  mockCreateSchedule: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      schedulesMethods: {
        createSchedule: mocks.mockCreateSchedule,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('createScheduleTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a tool instance with correct properties', () => {
    const tool = getCreateScheduleTool(new Server());
    expect(tool.name).toBe('create-schedule');
    expect(tool.description).toContain('Creates a new schedule');
    expect(tool.annotations).toMatchObject({
      title: 'Create Schedule',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('should create a daily schedule', async () => {
    mocks.mockCreateSchedule.mockResolvedValue(mockSchedule);

    const result = await getToolResult({
      name: 'Nightly Extracts',
      type: 'Extract',
      frequencyDetails: { frequency: 'Daily', start: '03:00:00' },
    });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    expect(JSON.parse(`${result.content[0].text}`)).toMatchObject({ id: mockSchedule.id });
    expect(mocks.mockCreateSchedule).toHaveBeenCalledWith({
      siteId: 'test-site-id',
      input: {
        name: 'Nightly Extracts',
        type: 'Extract',
        frequencyDetails: { frequency: 'Daily', start: '03:00:00' },
      },
    });
  });

  it('should create an hourly schedule with intervals', async () => {
    mocks.mockCreateSchedule.mockResolvedValue(mockSchedule);

    const result = await getToolResult({
      name: 'Business Hours Hourly',
      type: 'Extract',
      frequencyDetails: {
        frequency: 'Hourly',
        start: '08:00:00',
        end: '20:00:00',
        intervals: [{ hours: '2' }],
      },
    });

    expect(result.isError).toBe(false);
    expect(mocks.mockCreateSchedule).toHaveBeenCalled();
    const callArgs = mocks.mockCreateSchedule.mock.calls[0][0];
    expect(callArgs.input.frequencyDetails.frequency).toBe('Hourly');
    expect(callArgs.input.frequencyDetails.intervals).toEqual([{ hours: '2' }]);
  });

  it('should create a weekly schedule with multiple weekdays', async () => {
    mocks.mockCreateSchedule.mockResolvedValue(mockSchedule2);

    const result = await getToolResult({
      name: 'MWF Flows',
      type: 'Flow',
      frequencyDetails: {
        frequency: 'Weekly',
        start: '06:30:00',
        intervals: [{ weekDay: 'Monday' }, { weekDay: 'Wednesday' }, { weekDay: 'Friday' }],
      },
    });

    expect(result.isError).toBe(false);
    const callArgs = mocks.mockCreateSchedule.mock.calls[0][0];
    expect(callArgs.input.frequencyDetails.intervals).toHaveLength(3);
  });

  it('should create a monthly LastDay schedule', async () => {
    mocks.mockCreateSchedule.mockResolvedValue(mockSchedule);

    const result = await getToolResult({
      name: 'Month End Subs',
      type: 'Subscription',
      frequencyDetails: {
        frequency: 'Monthly',
        start: '23:00:00',
        intervals: [{ monthDay: 'LastDay' }],
      },
    });

    expect(result.isError).toBe(false);
    const callArgs = mocks.mockCreateSchedule.mock.calls[0][0];
    expect(callArgs.input.frequencyDetails.intervals).toEqual([{ monthDay: 'LastDay' }]);
  });

  it('should reject a malformed time-of-day at input validation', async () => {
    mocks.mockCreateSchedule.mockResolvedValue(mockSchedule);

    const result = await getToolResult({
      name: 'Bad Time',
      type: 'Extract',

      frequencyDetails: { frequency: 'Daily', start: '3am' } as any,
    });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    // Validation comes from the Zod `.parse()` inside the tool callback which
    // throws; the tool's logAndExecute wraps that into an error result.
    expect(result.content[0].text.toLowerCase()).toContain('24-hour');
    expect(mocks.mockCreateSchedule).not.toHaveBeenCalled();
  });

  it('should reject a monthly schedule with an out-of-range monthDay', async () => {
    const result = await getToolResult({
      name: 'Bad Monthly',
      type: 'Extract',
      frequencyDetails: {
        frequency: 'Monthly',
        start: '00:00:00',
        intervals: [{ monthDay: '32' }],
      },
    });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text.toLowerCase()).toContain('day-of-month');
    expect(mocks.mockCreateSchedule).not.toHaveBeenCalled();
  });

  it('should surface API errors (e.g. 403 from non-admin caller)', async () => {
    mocks.mockCreateSchedule.mockRejectedValue(new Error('Forbidden'));

    const result = await getToolResult({
      name: 'Nope',
      type: 'Extract',
      frequencyDetails: { frequency: 'Daily', start: '03:00:00' },
    });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('Forbidden');
  });
});

async function getToolResult(args: Record<string, unknown>): Promise<CallToolResult> {
  const tool = getCreateScheduleTool(new Server());
  const callback = await Provider.from(tool.callback);

  return await callback(args as any, getMockRequestHandlerExtra());
}
