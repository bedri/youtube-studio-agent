export default defineNitroPlugin((nitroApp) => {
  // Wait for Nitro to be ready
  nitroApp.hooks.hook('request', () => {
    // This hook runs on every request, we just want to initialize once
    // But Nitro doesn't have a perfect "ready" hook for background tasks in all environments
    // So we use a simple singleton pattern
  })

  const intervalMinutes = parseInt(process.env.SENTINEL_INTERVAL_MINUTES || '60')
  const intervalMs = intervalMinutes * 60 * 1000

  console.log(`[Worker] Sentinel background worker initialized. Interval: ${intervalMinutes} minutes.`)

  // Run immediately on start (after a short delay to let everything settle)
  setTimeout(() => {
    runSentinelCheck()
  }, 10000)

  // Set up recurring interval
  setInterval(() => {
    runSentinelCheck()
  }, intervalMs)
})
