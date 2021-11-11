# Job Manager

A simple MongoDB-based job manager for orchestrating the execution of asynchronous tasks. Multi-producer and multi-consumer, with MongoDB as a single source of truth. Atomic updates guarantee each job is executed by at most one worker. An arbitraty amount of workers, typically running on separate threads and/or in separate processes, may be connected and execute jobs in parallel.

The package makes it easy to queue various tasks for eventual execution. The rate of execution can be easily adjusted by spawning or terminating worker processes. As long as the MongoDB node or cluster is operational and there is at least one active, connected worker configured to handle the existing task types, the system will make progress. Then, each task will be invoked and completed (unless the task executor throws an error).

# Installation

```
yarn add @togedo/job-manager
```

# Initialization

```
const jm = await JobManager('databaseName')
```

The `JobManager` object serves both as a producer and a consumer. Typical producer code, i.e. the one queuing the tasks, looks like this:
```
const jm = await JobManager('mongoJobManagerDb')
jm.create({
  type: "myJob",
  data: { inputField1: "a", inputField2: 1 }
});
```

The consumer/worker instances of `JobManager` need to know how to execute certain tasks. That information needs to be provided in the `executors` object, in the form of asynchronous functions that are invoked with the job's `data` object as the first argument and the `JobManager` instance as the second. Different workers might have different executors and specialize in different job types.
```
const jm = await JobManager('mongoJobManagerDb', {
  executors: {
    myJob: async ({ inputField1, inputField2 }) => {
      console.log(`Executing myJob. Input 1: ${inputField1}, input 2: ${inputField2}`)
    }
  }
})
// Continuously execute and poll for new jobs of type 'myJob'
await jm.startWatch('myJob')
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

## Continuously run and poll for any jobs of type 'a' or 'b'

```
await jm.startWatch('a', 'b')
```
