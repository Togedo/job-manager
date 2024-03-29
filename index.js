// @flow

const { getMac } = require("getmac");
const sha1 = require("sha1");
const stringify = require("fast-stable-stringify");
const MongoClient = require("mongodb").MongoClient;

const noJob = Symbol("no job");

const getmac = () =>
  new Promise((done, reject) =>
    getMac((err, addr) => (err ? reject(err) : done(addr)))
  );

const getJobId = ({ data, type }) => sha1(type + stringify(data));

const getWorkerId = async () => `${await getmac()}_${process.pid}`;

const DB = async (dbName, url = "mongodb://localhost:27017") => {
  const mongo = await MongoClient.connect(url, {
    reconnectTries: 10000000,
    useNewUrlParser: true,
    connectTimeoutMS: 1000000000,
    socketTimeoutMS: 1000000000,
  });
  return mongo;
};

const api = {
  create:
    (jm) =>
    async (...jobs) => {
      for (let i = 0; i < jobs.length; i++) {
        try {
          if (!jobs[i]._id) jobs[i]._id = getJobId(jobs[i]);
          await jm.col.insertOne({
            ...jobs[i],
            status: "queued",
            createdAt: new Date(),
          });
        } catch (e) {}
      }
    },
  error: (jm) => async (job) =>
    jm.save({ _id: job._id, error: job.error, status: "error" }),
  exit: (jm) => async () => jm.mongo && jm.mongo.close(),
  find:
    (jm) =>
    async (...args) =>
      jm.col.find(...args),
  finish: (jm) => async (job) =>
    jm.save({
      _id: job._id,
      result: job.result,
      completedAt: new Date(),
      status: "done",
    }),
  getSetting: (jm) => (jobType, setting) =>
    (jobType && jm.executors[jobType][setting]) || jm[setting],
  load: (jm) => async (job) => {
    try {
      return jm.col.findOne(job);
    } catch (e) {}
  },
  pick: (jm) => async (types) => {
    const now = new Date();
    const query = {
      $and: [
        {
          $or: [
            { scheduledTime: null },
            { scheduledTime: { $lte: new Date() } },
          ],
        },
        {
          $or: [
            {
              status: "active",
              updatedAt: {
                $lt: new Date(now - jm.getSetting(null, "abandonedDelay")),
              },
            },
            { status: "queued" },
            {
              status: "error",
              nTries: { $lt: jm.getSetting(null, "maxTries") },
            },
          ],
        },
      ],
    };
    if (types.length) query.type = { $in: types };
    const r = await jm.col.findOneAndUpdate(
      query,
      {
        $inc: { nTries: 1 },
        $set: {
          startedAt: now,
          status: "active",
          updatedAt: now,
          worker: jm.workerId,
        },
      },
      {
        returnNewDocument: true,
        sort: {
          priority: -1,
          createdAt: 1,
        },
      }
    );
    if (r.value)
      return jm.load({
        status: "active",
        worker: jm.workerId,
      });
  },
  remove:
    (jm) =>
    (query = {}) =>
      jm.col.deleteOne(query),
  removeAll:
    (jm) =>
    (query = {}) =>
      jm.col.deleteMany(query),
  run:
    (jm) =>
    async (...types) => {
      const job = await jm.pick(types);
      if (!job) return noJob;
      const { type } = job;
      try {
        const runner =
          typeof jm.executors[type] === "object"
            ? jm.executors[type].runner
            : jm.executors[type];

        result = await runner(job.data, jm);

        await jm.finish({ ...job, result });
        return result;
      } catch (e) {
        await jm.error({ ...job, error: { code: e.code, message: e.message } });
        return e;
      }
    },
  runAll:
    (jm) =>
    async (...types) => {
      do {
        r = await jm.run(...types);
        if (jm.stopped) break;
      } while (r !== noJob);
    },
  startWatch:
    (jm) =>
    async (...types) => {
      jm.watching = true;
      try {
        await jm.runAll(...types);
      } catch (e) {
        console.log(e);
        console.log("retrying...");
      }
      setTimeout(async () => {
        if (jm.watching) await jm.startWatch(...types);
      }, jm.watchInterval);
    },
  stopWatch: (jm) => async () => {
    jm.watching = false;
  },
  stop: (jm) => async () => {
    jm.stopped = true;
  },
  save: (jm) => async (job) => {
    let { _id, ...upd } = job;
    if (!_id) _id = getJobId(job);
    return jm.col.updateOne({ _id }, { $set: upd }, { upsert: true });
  },
};

const heartbeat = (jm) => {
  jm.col.updateOne(
    { worker: jm.workerId, status: "active" },
    { $set: { updatedAt: new Date() } }
  );
  setTimeout(() => heartbeat(jm), jm.heartbeatInterval);
};

const JobManager = async (
  db,
  {
    colName = "jobs",
    executors = {},
    abandonedDelay = 10000,
    heartbeatInterval = 5000,
    watchInterval = 5000,
    maxTries = 3,
    workerId,
  } = {}
) => {
  let mongo;
  if (typeof db === "string") {
    mongo = await DB();
    db = mongo.db(db);
  }
  const col = db.collection(colName);
  const ctx = {
    col,
    colName,
    db,
    executors,
    mongo,
    abandonedDelay,
    heartbeatInterval,
    maxTries,
    watchInterval,
    stopped: false,
    watching: false,
    workerId: workerId || (await getWorkerId()),
  };
  Object.entries(api).forEach(([name, func]) => {
    ctx[name] = func(ctx);
  });
  heartbeat(ctx);
  return ctx;
};

module.exports = JobManager;
