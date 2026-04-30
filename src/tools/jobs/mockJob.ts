import { Job } from '../../sdks/tableau/types/job.js';

export const mockJob = {
  id: 'j0b1d2e3-ffff-0000-1111-222233334444',
  mode: 'Asynchronous',
  type: 'RunFlow',
  progress: '0',
  createdAt: '2024-06-10T23:23:23Z',
} satisfies Job;

export const mockCompletedJob = {
  id: 'j0b1d2e3-ffff-0000-1111-222233334444',
  mode: 'Asynchronous',
  type: 'RunFlow',
  progress: '100',
  createdAt: '2024-06-10T23:23:23Z',
  startedAt: '2024-06-10T23:23:24Z',
  completedAt: '2024-06-10T23:24:10Z',
  finishCode: '0',
} satisfies Job;
