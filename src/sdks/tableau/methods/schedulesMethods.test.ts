import { exportedForTesting } from './schedulesMethods.js';

const { buildCreateScheduleRequestBody } = exportedForTesting;

describe('buildCreateScheduleRequestBody', () => {
  it('emits a daily schedule with empty intervals array', () => {
    const body = buildCreateScheduleRequestBody({
      name: 'Nightly',
      type: 'Extract',
      frequencyDetails: { frequency: 'Daily', start: '03:00:00' },
    });
    expect(body).toEqual({
      schedule: {
        name: 'Nightly',
        type: 'Extract',
        frequency: 'Daily',
        priority: undefined,
        executionOrder: undefined,
        frequencyDetails: {
          start: '03:00:00',
          end: undefined,
          intervals: { interval: [] },
        },
      },
    });
  });

  it('emits an hourly schedule with both start and end and per-interval hours', () => {
    const body = buildCreateScheduleRequestBody({
      name: 'Business Hours',
      type: 'Extract',
      priority: 25,
      executionOrder: 'Serial',
      frequencyDetails: {
        frequency: 'Hourly',
        start: '08:00:00',
        end: '20:00:00',
        intervals: [{ hours: '2' }, { minutes: '30' }],
      },
    });
    expect(body.schedule.frequency).toBe('Hourly');
    expect(body.schedule.frequencyDetails.start).toBe('08:00:00');
    expect(body.schedule.frequencyDetails.end).toBe('20:00:00');
    expect(body.schedule.frequencyDetails.intervals.interval).toEqual([
      { hours: '2', minutes: undefined },
      { hours: undefined, minutes: '30' },
    ]);
    expect(body.schedule.priority).toBe(25);
    expect(body.schedule.executionOrder).toBe('Serial');
  });

  it('emits a weekly schedule with weekDay entries', () => {
    const body = buildCreateScheduleRequestBody({
      name: 'MWF',
      type: 'Flow',
      frequencyDetails: {
        frequency: 'Weekly',
        start: '06:30:00',
        intervals: [{ weekDay: 'Monday' }, { weekDay: 'Wednesday' }, { weekDay: 'Friday' }],
      },
    });
    expect(body.schedule.frequency).toBe('Weekly');
    expect(body.schedule.frequencyDetails.intervals.interval).toEqual([
      { weekDay: 'Monday' },
      { weekDay: 'Wednesday' },
      { weekDay: 'Friday' },
    ]);
    // `end` is unset for non-hourly schedules.
    expect(body.schedule.frequencyDetails.end).toBeUndefined();
  });

  it('emits a monthly schedule with LastDay', () => {
    const body = buildCreateScheduleRequestBody({
      name: 'Month End',
      type: 'Subscription',
      frequencyDetails: {
        frequency: 'Monthly',
        start: '23:00:00',
        intervals: [{ monthDay: 'LastDay' }],
      },
    });
    expect(body.schedule.frequency).toBe('Monthly');
    expect(body.schedule.frequencyDetails.intervals.interval).toEqual([{ monthDay: 'LastDay' }]);
  });
});
