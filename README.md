# Job Manager

A MongoDB-based job manager.

# Installation

```
yarn add @togedo/job-manager
```

# Initialization

```
const jm = await JobManager('databaseName')
```

# Creating jobs

```
await jm.create({type: 'a', data: {a: 1}})
```

# Completing jobs

## Run one job of type 'a'

```
await jm.run('a')
```

## Run all jobs of type 'a'

```
await jm.runAll('a')
```
