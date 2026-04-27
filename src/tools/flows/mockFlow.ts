import { Flow } from '../../sdks/tableau/types/flow.js';

export const mockFlow = {
  id: 'a1b2c3d4-1111-2222-3333-444455556666',
  name: 'Superstore Flow',
  description: 'Prep flow for the Superstore dataset.',
  webpageUrl: 'https://10ax.online.tableau.com/#/site/mcp-test/flows/1234',
  fileType: 'tflx',
  createdAt: '2024-06-10T23:23:23Z',
  updatedAt: '2024-06-10T23:23:23Z',
  project: { name: 'Samples', id: 'ae5e9374-2a58-40ab-93e4-a2fd1b07cf7d' },
  owner: { id: 'bbdee366-4a50-4c2c-a5c8-746da5b64483', name: 'admin' },
  tags: {
    tag: [
      {
        label: 'tag-1',
      },
    ],
  },
} satisfies Flow;

export const mockFlow2 = {
  id: 'f7e8d9c0-aaaa-bbbb-cccc-ddddeeeeffff',
  name: 'Finance Flow',
  fileType: 'tfl',
  createdAt: '2024-06-10T23:23:23Z',
  updatedAt: '2024-06-10T23:23:23Z',
  project: { name: 'Finance', id: '4862efd9-3c24-4053-ae1f-18caf18b6ffe' },
  owner: { id: 'cbdee366-4a50-4c2c-a5c8-746da5b64484', name: 'analyst' },
  tags: {
    tag: [
      {
        label: 'tag-2',
      },
    ],
  },
} satisfies Flow;
