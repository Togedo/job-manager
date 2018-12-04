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
  const mongo = await MongoClient.connect(
    url,
    { useNewUrlParser: true }
  );
  return mongo;
};

const api = {
  create: jm => async job => jm.save({ ...job }),
  error: jm => async job => jm.save({ ...job, status: "error" }),
  exit: jm => async () => jm.mongo && jm.mongo.close(),
  finish: jm => async job =>
    jm.save({ ...job, completedAt: new Date(), status: "done" }),
  load: jm => async job => {
    try {
      return jm.col.findOne(job);
    } catch (e) {}
  },
  pick: jm => async type => {
    const now = new Date();
    const r = await jm.col.updateOne(
      {
        type,
        $or: [
          {
            status: "active",
            updatedAt: { $lt: new Date(now - jm.abandonedDelay) }
          },
          { status: "queued" },
          { status: "error", nTries: { $lt: 3 } }
        ]
      },
      {
        $inc: { nTries: 1 },
        $set: {
          startedAt: now,
          status: "active",
          updatedAt: now,
          worker: jm.workerId
        }
      }
    );
    if (r.result.nModified)
      return jm.load({
        status: "active",
        worker: jm.workerId
      });
  },
  remove: jm => async query => jm.col.deleteOne(query),
  removeAll: jm => async query => jm.col.deleteMany(query),
  run: jm => async type => {
    const job = await jm.pick(type);
    if (!job) return noJob;
    try {
      const result = await jm.executors[type](job.data, jm);
      await jm.finish({ ...job, result });
      return result;
    } catch (e) {
      console.log(e);
      await jm.error({ ...job, error: { code: e.code, message: e.message } });
      return e;
    }
  },
  runAll: jm => async type => {
    let r;
    do {
      r = await jm.run(type);
    } while (r !== noJob);
  },
  save: jm => async job => {
    if (!job._id) job._id = getJobId(job);
    return jm.col.updateOne(
      { _id: job._id },
      { $set: job, $setOnInsert: { createdAt: new Date(), status: "queued" } },
      { upsert: true }
    );
  }
};

const heartbeat = jm => {
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
    heartbeatInterval = 5000,
    abandonedDelay = 10000,
    maxTries = 3,
    workerId
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
    workerId: workerId || (await getWorkerId())
  };
  Object.entries(api).forEach(([name, func]) => {
    ctx[name] = func(ctx);
  });
  heartbeat(ctx);
  return ctx;
};

const now = async (n, fn) => console.log(n, await fn());

module.exports = JobManager;
