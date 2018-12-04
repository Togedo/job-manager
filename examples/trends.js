const JobManager = require("../");

const getLocalTrends = async data => {
  console.log("getting local trends", data);
};

const scheduleLocalTrendJobs = async (data, jm) => {
  console.log("scheduling");
  for (let i = 0; i < 10; i++)
    jm.create({
      type: "getLocalTrends",
      data: { city: i, period: data.period }
    });
};

const executors = {
  getLocalTrends,
  scheduleLocalTrendJobs
};

(async () => {
  const jm = await JobManager("jobs", {
    executors
  });
  // await jm.removeAll();
  const d = new Date();
  const period = `${d.getMonth() + 1} ${d.getFullYear()}`;
  await jm.create({ type: "scheduleLocalTrendJobs", data: { period } });
  await jm.run("scheduleLocalTrendJobs");
  await jm.runAll("getLocalTrends");
})();
