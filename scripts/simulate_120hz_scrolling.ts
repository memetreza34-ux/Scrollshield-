// Simulation of 120Hz continuous scrolling event stream (1 event every 8.33ms)

interface EventPipelineResult {
  totalEventsReceived: number;
  checksExecuted: number;
  averageInterCheckIntervalMs: number;
  timeToFirstDetectionMs: number | null;
  scrollingStarvation: boolean;
}

function simulatePipeline(
  durationMs: number,
  strategy: 'debounce_120' | 'sample_120' | 'throttle_120',
  toxicAppearsAtMs: number
): EventPipelineResult {
  const frameIntervalMs = 8.333; // 120Hz
  let currentTime = 0;
  let totalEvents = 0;
  let checksExecuted = 0;
  let lastSampleTime = -Infinity;
  let debounceTimer: number | null = null;
  let timeToFirstDetection: number | null = null;
  const executionTimes: number[] = [];

  while (currentTime <= durationMs) {
    totalEvents++;
    const isToxicPresent = currentTime >= toxicAppearsAtMs;

    if (strategy === 'sample_120') {
      // Kotlin Coroutines Flow.sample(120): emits the latest value within each 120ms window
      if (currentTime - lastSampleTime >= 120) {
        lastSampleTime = currentTime;
        checksExecuted++;
        executionTimes.push(currentTime);
        if (isToxicPresent && timeToFirstDetection === null) {
          timeToFirstDetection = currentTime - toxicAppearsAtMs;
        }
      }
    } else if (strategy === 'debounce_120') {
      // Classic debounce(120): waits for 120ms of silence. Resets timer on every event.
      debounceTimer = currentTime + 120;
    }

    currentTime += frameIntervalMs;
  }

  // After scrolling stops at durationMs
  if (strategy === 'debounce_120' && debounceTimer !== null) {
    currentTime = debounceTimer;
    checksExecuted++;
    executionTimes.push(currentTime);
    if (currentTime >= toxicAppearsAtMs && timeToFirstDetection === null) {
      timeToFirstDetection = currentTime - toxicAppearsAtMs;
    }
  }

  const starvation = strategy === 'debounce_120' && checksExecuted <= 1;

  let sumIntervals = 0;
  for (let i = 1; i < executionTimes.length; i++) {
    sumIntervals += (executionTimes[i] - executionTimes[i - 1]);
  }
  const avgInterval = executionTimes.length > 1 ? sumIntervals / (executionTimes.length - 1) : 0;

  return {
    totalEventsReceived: totalEvents,
    checksExecuted,
    averageInterCheckIntervalMs: avgInterval,
    timeToFirstDetectionMs: timeToFirstDetection,
    scrollingStarvation: starvation,
  };
}

console.log("=== 120Hz Continuous Scrolling Simulation (2000ms scrolling duration) ===");
console.log("Toxic content appears on screen at t = 300ms");

const sampleResult = simulatePipeline(2000, 'sample_120', 300);
console.log("\n1. Strategy: Kotlin Coroutines sample(120ms)");
console.log(`- Total 120Hz events received: ${sampleResult.totalEventsReceived}`);
console.log(`- Total NLP checks executed: ${sampleResult.checksExecuted}`);
console.log(`- Average interval between checks: ${sampleResult.averageInterCheckIntervalMs.toFixed(1)}ms (~${(1000/sampleResult.averageInterCheckIntervalMs).toFixed(1)} FPS)`);
console.log(`- Latency from appearance to detection: ${sampleResult.timeToFirstDetectionMs?.toFixed(1)}ms`);
console.log(`- Scrolling starvation: ${sampleResult.scrollingStarvation}`);

const debounceResult = simulatePipeline(2000, 'debounce_120', 300);
console.log("\n2. Strategy: Classic debounce(120ms)");
console.log(`- Total 120Hz events received: ${debounceResult.totalEventsReceived}`);
console.log(`- Total NLP checks executed: ${debounceResult.checksExecuted}`);
console.log(`- Latency from appearance to detection: ${debounceResult.timeToFirstDetectionMs?.toFixed(1)}ms (User saw toxic content for ${(debounceResult.timeToFirstDetectionMs!/1000).toFixed(2)}s before check ran!)`);
console.log(`- Scrolling starvation: ${debounceResult.scrollingStarvation}`);

