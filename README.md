# Job Manager

A MongoDB-based job manager. Multi-producer and multi-consumer, with MongoDB as a single source of truth. Atomic updates guarantee each job is executed by at most one worker. An arbitraty amount of workers may be connected and execute jobs in parallel.

# Installation

```
yarn add @togedo/job-manager
```

# Initialization

```
const jm = await JobManager('databaseName')
```

# Creating jobs

By default, the unique identifier of each job is based on a stable serialization of the `data` object. The `data` object is meant to fully describe a task. Each task is executed at most once, regardless of how many times it's queued. This can be overridden by passing a unique `id` to each job that is meant to be distinguished from others that have an identical `data` object.
```
await jm.create({type: 'a', data: {a: 1}})
await jm.create({id: 'doItAgain', type: 'a', data: {a: 1}})
```

The encouraged way of handling recurring jobs is the inclusion of a `Date` object or a timestamp in the `data` object:
```
await jm.create({type: 'springCleanup', data: {date: Date.now()}})
...
await jm.create({type: 'springCleanup', data: {date: Date.now()}})
```

This ensures the jobs are easily inspectable due to storing all meaningful information in the `data` object. In addition, this prevents a job that is meant to be executed just once from being erroneously queued and invoked multiple times.

# Running jobs

## Run one job of type 'a'

```
await jm.run('a')
```

## Run all jobs of type 'a'

```
await jm.runAll('a')
```
