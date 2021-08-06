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
      b: {
        runner: async data => {
          console.log("executing b", data);
          if (Math.random() > 0.9) throw new Error("e");
          await sleep(Math.random() * 300);
          return data;
        },
        maxTries: 10,
        abandonedDelay: 2000
      }
    }
  });

  console.log('started JM')

  await jm.removeAll();

  await sleep(2000)

  console.log('removed old tasks')

  for (let i = 0; i < 20; i++) {
    await jm.create({ type: "a", data: i }, { type: "b", data: i * 2 });
    await sleep(5000)
    console.log(`Created job ${i}`)
  }

  jm.runAll();
})().then(r => {
  console.log('r', r)
}).catch((e) => {
  console.error('e', e)
})