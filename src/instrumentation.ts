export async function register() {
  // Only run scheduler on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initScheduler } = await import("@/lib/pipeline/scheduler");
    initScheduler();
  }
}
