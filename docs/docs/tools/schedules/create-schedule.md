---
sidebar_position: 2
---

# Create Schedule

Creates a new schedule on the Tableau site. Returns the created schedule, including its
server-assigned `id`.

**Requires admin privileges.** On Tableau Cloud this is a site-admin operation; on Tableau Server
a server-admin operation. Non-admin callers will receive HTTP 403 from Tableau.

## APIs called

- [Create Schedule](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#create_schedule)

## Required arguments

### `name`

Name for the new schedule.

### `type`

What the schedule drives. One of:

- `Extract`
- `Subscription`
- `Flow`

### `frequencyDetails`

A discriminated union keyed on `frequency`. The accepted shape depends on which frequency you pick.

#### `frequency: "Hourly"`

- `start` — `HH:MM:SS` (24-hour)
- `end` — `HH:MM:SS` (24-hour)
- `intervals` — array of objects; each entry has **one** of:
  - `hours` — one of `"1"`, `"2"`, `"4"`, `"6"`, `"8"`, `"12"`
  - `minutes` — one of `"15"`, `"30"`, `"60"`

#### `frequency: "Daily"`

- `start` — `HH:MM:SS` (24-hour)

#### `frequency: "Weekly"`

- `start` — `HH:MM:SS` (24-hour)
- `intervals` — array of objects with `weekDay` in `Sunday..Saturday`

#### `frequency: "Monthly"`

- `start` — `HH:MM:SS` (24-hour)
- `intervals` — array of objects with `monthDay` in `"1".."31"` or the literal `"LastDay"`

## Optional arguments

### `priority`

Integer `1..100`. Lower numbers run first. Defaults to Tableau's server default (typically 50).

### `executionOrder`

`Parallel` or `Serial`. Defaults server-side (typically `Parallel`).

## Side effects

- Adds a schedule resource on the site. Future tasks bound to this schedule will run at the
  specified cadence.
- Re-running the tool with identical inputs creates a **new** schedule; it does not deduplicate.
  If you need at-most-once semantics, first call [List Schedules](list-schedules.md) with a name
  filter.

## Example: daily at 03:00

```json
{
  "name": "Nightly Extracts",
  "type": "Extract",
  "frequencyDetails": { "frequency": "Daily", "start": "03:00:00" }
}
```

## Example: hourly, every 2 hours between 08:00 and 20:00

```json
{
  "name": "Business Hours Hourly",
  "type": "Extract",
  "frequencyDetails": {
    "frequency": "Hourly",
    "start": "08:00:00",
    "end": "20:00:00",
    "intervals": [{ "hours": "2" }]
  }
}
```

## Example: weekly on Mon/Wed/Fri at 06:30

```json
{
  "name": "MWF Flows",
  "type": "Flow",
  "frequencyDetails": {
    "frequency": "Weekly",
    "start": "06:30:00",
    "intervals": [
      { "weekDay": "Monday" },
      { "weekDay": "Wednesday" },
      { "weekDay": "Friday" }
    ]
  }
}
```

## Example: monthly on the last day at 23:00

```json
{
  "name": "Month End Subs",
  "type": "Subscription",
  "frequencyDetails": {
    "frequency": "Monthly",
    "start": "23:00:00",
    "intervals": [{ "monthDay": "LastDay" }]
  }
}
```

## Example result

```json
{
  "id": "sched000-aaaa-bbbb-cccc-dddd00000099",
  "name": "Nightly Extracts",
  "state": "Active",
  "priority": 50,
  "createdAt": "2024-06-10T23:23:23Z",
  "updatedAt": "2024-06-10T23:23:23Z",
  "frequency": "Daily",
  "nextRunAt": "2024-06-11T03:00:00Z",
  "executionOrder": "Parallel",
  "type": "Extract"
}
```
