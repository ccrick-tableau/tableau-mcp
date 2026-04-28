---
sidebar_position: 1
---

# List Schedules

Retrieves a list of schedules on a Tableau site.

Supported on both Tableau Cloud and Tableau Server, via the site-scoped schedules endpoint.

## APIs called

- [List Schedules](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#list_schedules)

## Optional arguments

### `filter`

A
[filter expression](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm)
as defined in the
[Tableau REST API Schedules filter fields](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm#schedules).

Filter field support varies between Cloud and Server; the tool accepts the Server-documented
superset and lets the Tableau backend decide what to honor.

Example: `type:eq:Extract`

<hr />

### `pageSize`

The value of the `page-size` argument provided to the
[List Schedules](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#list_schedules)
REST API. The tool automatically performs pagination and will repeatedly call the REST API until
either all schedules are retrieved or the `limit` argument has been reached.

Example: `1000`

<hr />

### `limit`

The maximum number of schedules to return. The tool will return at most this many schedules.

Example: `2000`

See also: [`MAX_RESULT_LIMIT`](../../configuration/mcp-config/env-vars.md#max_result_limit)

## Example result

```json
[
  {
    "id": "sched000-aaaa-bbbb-cccc-dddd00000001",
    "name": "Daily 3am",
    "state": "Active",
    "priority": 50,
    "createdAt": "2024-06-10T23:23:23Z",
    "updatedAt": "2024-06-10T23:23:23Z",
    "frequency": "Daily",
    "nextRunAt": "2024-06-11T03:00:00Z",
    "executionOrder": "Parallel",
    "type": "Extract"
  }
]
```
