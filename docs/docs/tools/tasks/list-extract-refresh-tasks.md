---
sidebar_position: 1
---

# List Extract Refresh Tasks

Retrieves all extract refresh tasks configured on the Tableau site, including their target
(workbook or datasource), schedule, type (FullRefresh or IncrementalRefresh), and health counters.

The underlying Tableau REST endpoint does not support pagination or filtering, so this tool takes
no arguments and returns every task the caller has permission to see.

## APIs called

- [Get Extract Refresh Tasks](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#get_extract_refresh_tasks)

## Arguments

None.

## Example result

```json
[
  {
    "id": "task1111-aaaa-bbbb-cccc-dddd00000001",
    "type": "FullRefresh",
    "priority": 50,
    "consecutiveFailedCount": 0,
    "schedule": {
      "id": "sched000-aaaa-bbbb-cccc-dddd00000001",
      "name": "Daily 3am",
      "state": "Active",
      "priority": 50,
      "frequency": "Daily",
      "nextRunAt": "2024-06-11T03:00:00Z"
    },
    "workbook": { "id": "96a43833-27db-40b6-aa80-751efc776b9a" }
  },
  {
    "id": "task1111-aaaa-bbbb-cccc-dddd00000002",
    "type": "IncrementalRefresh",
    "priority": 25,
    "consecutiveFailedCount": 1,
    "datasource": { "id": "2d935df8-fe7e-4fd8-bb14-35eb4ba31d45" }
  }
]
```

Pass the `id` of a returned task to the [Run Extract Refresh](run-extract-refresh.md) tool to
kick off an on-demand refresh.
