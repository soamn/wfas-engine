import v8 from "v8";

let lastBaseline = 0;
let leakAlertCount = 0;

const getHeapAnalysis = () => {
  const heapSpace = v8.getHeapStatistics();
  const usage = process.memoryUsage();

  const analysis = {
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`, // Buffers/C++ objects
    arrayBuffers: `${Math.round(usage.arrayBuffers / 1024 / 1024)}MB`,
  };

  console.log("📊 --- Detailed Memory Breakdown ---");
  console.table(analysis);

  const spaces = v8.getHeapSpaceStatistics();
  const oldSpace = spaces.find((s) => s.space_name === "old_space");
  if (oldSpace) {
    console.log(
      `[OLD SPACE] Used: ${Math.round(oldSpace.space_used_size / 1024 / 1024)}MB / Allocated: ${Math.round(oldSpace.space_size / 1024 / 1024)}MB`,
    );
  }
};

export const startMemoryMonitor = (intervalMs: number = 30000) => {
  console.log("🚀 Smart Memory Monitor with Deep Inspection Started...");

  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);

    if (lastBaseline === 0 || heapUsedMB < lastBaseline) {
      lastBaseline = heapUsedMB;
      leakAlertCount = 0;
    }

    if (heapUsedMB > lastBaseline + 15) {
      leakAlertCount++;

      if (leakAlertCount >= 5) {
        console.warn(
          `🚨 SUSPECTED LEAK: Heap is ${heapUsedMB}MB (Baseline: ${lastBaseline}MB)`,
        );

        if (global.gc) {
          console.log("🔍 Triggering Manual GC & Deep Inspection...");
          global.gc();

          const postGC = Math.round(
            process.memoryUsage().heapUsed / 1024 / 1024,
          );

          if (postGC > lastBaseline + 5) {
            console.error(`❌ CONFIRMED LEAK: Memory stuck at ${postGC}MB`);

            getHeapAnalysis();

            console.log(
              "💡 HINT: If 'external' is high, it's Prisma/Network Buffers.",
            );
            console.log(
              "💡 HINT: If 'heapUsed' is high after GC, check for un-nullified 'context' or 'nodeResults'.",
            );
          } else {
            console.log(
              `✅ FALSE ALARM: Manual GC cleared the heap to ${postGC}MB.`,
            );
            lastBaseline = postGC;
            leakAlertCount = 0;
          }
        }
      }
    } else {
      console.log(
        `[MEM] Heap: ${heapUsedMB}MB | RSS: ${rssMB}MB (Baseline: ${lastBaseline}MB)`,
      );
    }
  }, intervalMs);
};
