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

Jobs with identical data objects

```
await jm.create({type: 'a', data: {a: 1}})
```

# Running jobs

## Run one job of type 'a'

```
await jm.run('a')
```

## Run all jobs of type 'a'

```
await jm.runAll('a')
```
