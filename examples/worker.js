// @flow

const JobManager = require("../");

const sleep = s => new Promise(done => setTimeout(done, s));

(async () => {
  const jm = await JobManager("jobs", {
    executors: {
      a: async data => {
        console.log("executing a", data);
        if (Math.random() > 0.8) throw new Error("e");
        await sleep(1000 + Math.random() * 2000);
        return data.a;
      }
    }
  });
  await jm.runAll("a");
})();
