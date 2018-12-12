// @flow

const JobManager = require("..");

const sleep = s => new Promise(done => setTimeout(done, s));

(async () => {
  const jm = await JobManager("jobs", {
    executors: {
      a: async data => {
        console.log("executing a", data);
        if (Math.random() > 0.9) throw new Error("e");
        await sleep(Math.random() * 200);
        return data;
      },
      b: async data => {
        console.log("executing b", data);
        if (Math.random() > 0.9) throw new Error("e");
        await sleep(Math.random() * 300);
        return data;
      },
      c: async data => {
        console.log("executing c", data);
        if (Math.random() > 0.9) throw new Error("e");
        await sleep(Math.random() * 500);
        return data;
      }
    }
  });
  await jm.removeAll();
  for (let i = 0; i < 500; i++) {
    await jm.create(
      { type: "a", data: i },
      { type: "b", data: i * 2 },
      { type: "c", data: i * 3.5 }
    );
  }
  jm.startWatch();
  setTimeout(() => {
    console.log("STOP! Hammer time!");
    jm.stopWatch();
  }, 30000);
})();
