// @flow

const JobManager = require("..");

const sleep = s => new Promise(done => setTimeout(done, s));

(async () => {
  const jm = await JobManager("jobs", {
    executors: {
      a: async data => {
        console.log("executing a", data);
        await sleep(Math.random() * 500);
        return data;
      }
    }
  });
  await jm.removeAll();
  const N = 10;
  let round = 0;
  for (let i = 0; i < N; i++) {
    await jm.create({ type: "a", data: `${round}_${i}`, priority: i });
  }
  jm.startWatch();
  setTimeout(async () => {
    round += 1;
    for (let i = 0; i < N; i++) {
      await jm.create({ type: "a", data: `${round}_${i}`, priority: i });
    }
    console.log("Added more jobs");
  }, 5000);
  setTimeout(async () => {
    console.log("Stop! Hammer time!");
    jm.exit();
  }, 15000);
})();
