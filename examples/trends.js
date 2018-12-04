const JobManager = require("../");

const executors = {
  getLocalTrends: async data => {
    console.log("getting local trends", data);
  },
  scheduleLocalTrendJobs: async (data, jm) => {
    console.log("scheduling");
    for (let i = 0; i < 10; i++)
      jm.create({ type: "getLocalTrends", data: { city: i } });
  }
};

(async () => {
  const jm = await JobManager("jobs", {
    executors
  });
  // await jm.removeAll();
  await jm.create({ type: "scheduleLocalTrendJobs" });
  await jm.run("scheduleLocalTrendJobs");
  await jm.runAll("getLocalTrends");
})();
