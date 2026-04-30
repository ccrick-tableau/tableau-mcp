---
sidebar_position: 2
---

# Run Extract Refresh

Runs the specified extract refresh task and returns the job created to perform the refresh.

The refresh is executed asynchronously on the Tableau site. This tool returns the job immediately
without waiting for completion. Use the [Get Job](../jobs/get-job.md) tool to observe progress and
final status.

## APIs called

- [Get Extract Refresh Tasks](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#get_extract_refresh_tasks)
  (used to resolve the task's target for permission checks)
- [Run Extract Refresh Task](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#run_extract_refresh_task)

## Required arguments

### `taskId`

The LUID of the extract refresh task to run, typically obtained from
[List Extract Refresh Tasks](list-extract-refresh-tasks.md).

Example: `task1111-aaaa-bbbb-cccc-dddd00000001`

## Side effects

- The target workbook or datasource extract is refreshed, overwriting its current data with the
  latest query results.
- Running a refresh is not free: it consumes Tableau backgrounder capacity and counts against
  site-level refresh quotas.

## Example result

```json
{
  "id": "j0b1d2e3-ffff-0000-1111-222233334444",
  "mode": "Asynchronous",
  "type": "RefreshExtract",
  "progress": "0",
  "createdAt": "2024-06-10T23:23:23Z"
}
```

Pass the returned `id` to the [Get Job](../jobs/get-job.md) tool to poll for completion.
