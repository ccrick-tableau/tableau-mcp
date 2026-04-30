---
sidebar_position: 1
---

# Get Job

Returns the current status of an asynchronous Tableau job, such as a flow run or extract refresh
triggered by [Run Flow](../flows/run-flow.md) or [Run Extract Refresh](../tasks/run-extract-refresh.md).

## APIs called

- [Query Job](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#query_job)

## Required arguments

### `jobId`

The LUID of the job to query, typically obtained from the `id` field of a prior
[Run Flow](../flows/run-flow.md) or [Run Extract Refresh](../tasks/run-extract-refresh.md) result.

Example: `j0b1d2e3-ffff-0000-1111-222233334444`

## Interpreting the result

- `progress` — integer-as-string in `[0, 100]`.
- `startedAt` / `completedAt` — populated once the job has started / finished.
- `finishCode` (only meaningful once `completedAt` is set):
  - `"0"` success
  - `"1"` failed
  - `"2"` cancelled
- A job with no `completedAt` is still running or queued.

This tool performs a single point-in-time read. It does not poll or wait.

## Example result (in-progress job)

```json
{
  "id": "j0b1d2e3-ffff-0000-1111-222233334444",
  "mode": "Asynchronous",
  "type": "RunFlow",
  "progress": "35",
  "createdAt": "2024-06-10T23:23:23Z",
  "startedAt": "2024-06-10T23:23:24Z"
}
```

## Example result (completed job)

```json
{
  "id": "j0b1d2e3-ffff-0000-1111-222233334444",
  "mode": "Asynchronous",
  "type": "RunFlow",
  "progress": "100",
  "createdAt": "2024-06-10T23:23:23Z",
  "startedAt": "2024-06-10T23:23:24Z",
  "completedAt": "2024-06-10T23:24:10Z",
  "finishCode": "0"
}
```
