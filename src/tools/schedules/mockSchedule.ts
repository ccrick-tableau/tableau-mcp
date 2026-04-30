import { Schedule } from '../../sdks/tableau/types/schedule.js';

export const mockSchedule = {
  id: 'sched000-aaaa-bbbb-cccc-dddd00000001',
  name: 'Daily 3am',
  state: 'Active',
  priority: 50,
  createdAt: '2024-06-10T23:23:23Z',
  updatedAt: '2024-06-10T23:23:23Z',
  frequency: 'Daily',
  nextRunAt: '2024-06-11T03:00:00Z',
  executionOrder: 'Parallel',
  type: 'Extract',
} satisfies Schedule;

export const mockSchedule2 = {
  id: 'sched000-aaaa-bbbb-cccc-dddd00000002',
  name: 'Hourly Flow',
  state: 'Active',
  priority: 25,
  createdAt: '2024-06-10T23:23:23Z',
  updatedAt: '2024-06-10T23:23:23Z',
  frequency: 'Hourly',
  nextRunAt: '2024-06-11T00:00:00Z',
  executionOrder: 'Parallel',
  type: 'Flow',
} satisfies Schedule;
