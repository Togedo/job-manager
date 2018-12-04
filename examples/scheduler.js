// @flow

const JobManager = require("../");

(async () => {
  const jm = await JobManager("jobs", {
    executors: {
      a: async data => {
        await sleep(Math.random() * 10000);
        console.log("executing a", data);
        return data.a;
      }
    }
  });
  await jm.removeAll();
  for (let i = 0; i < 1000; i++) await jm.create({ type: "a", data: { a: i } });
  console.log("scheduled");
})();
