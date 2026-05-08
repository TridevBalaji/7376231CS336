const { Log } = require('../logging_middleware/logger')

const API_BASE = 'http://4.224.186.213/evaluation-service'
const LOG_API_KEY = process.env.LOG_API_KEY

async function fetchWithAuth(url) {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${LOG_API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }
    return response.json()
}

async function safeLog(stack, level, packageName, message) {
    try {
        return await Log(stack, level, packageName, message)
    } catch (error) {
        console.warn('Remote log failed:', error.message)
        return null
    }
}

function knapsack(vehicles, capacity) {
    const n = vehicles.length
    const dp = Array(n + 1).fill().map(() => Array(capacity + 1).fill(0))
    const selected = Array(n).fill(false)

    for (let i = 1; i <= n; i++) {
        const { Duration: weight, Impact: value } = vehicles[i - 1]
        for (let w = 0; w <= capacity; w++) {
            if (weight <= w) {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + value)
            } else {
                dp[i][w] = dp[i - 1][w]
            }
        }
    }

    // Backtrack to find selected items
    let w = capacity
    for (let i = n; i > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selected[i - 1] = true
            w -= vehicles[i - 1].Duration
        }
    }

    const selectedVehicles = vehicles.filter((_, i) => selected[i])
    const totalImpact = selectedVehicles.reduce((sum, v) => sum + v.Impact, 0)
    const totalDuration = selectedVehicles.reduce((sum, v) => sum + v.Duration, 0)

    return { selectedVehicles, totalImpact, totalDuration }
}

async function main(options = {}) {
    const results = []

    try {
        await safeLog('backend', 'info', 'service', 'Starting vehicle maintenance scheduler')

        const depotsData = await fetchWithAuth(`${API_BASE}/depots`)
        const vehiclesData = await fetchWithAuth(`${API_BASE}/vehicles`)

        const depots = depotsData.depots
        const vehicles = vehiclesData.vehicles

        await safeLog('backend', 'info', 'service', `Fetched ${depots.length} depots and ${vehicles.length} vehicles`)

        const targetDepots = Array.isArray(options.depotIds) ?
            depots.filter(depot => options.depotIds.includes(depot.ID)) :
            depots

        for (const depot of targetDepots) {
            const { ID, MechanicHours } = depot
            const result = knapsack(vehicles, MechanicHours)
            const schedule = {
                depotId: ID,
                mechanicHours: MechanicHours,
                selectedTasks: result.selectedVehicles.map(v => ({ taskId: v.TaskID, duration: v.Duration, impact: v.Impact })),
                totalImpact: result.totalImpact,
                totalDuration: result.totalDuration
            }

            await safeLog('backend', 'info', 'service', `Depot ${ID}: Selected ${schedule.selectedTasks.length} vehicles, Total Impact: ${schedule.totalImpact}, Total Duration: ${schedule.totalDuration}/${MechanicHours}`)

            console.log(`Depot ${ID}:`)
            console.log(`Selected Vehicles:`, schedule.selectedTasks.map(v => v.taskId))
            console.log(`Total Impact: ${schedule.totalImpact}, Duration: ${schedule.totalDuration}/${MechanicHours}`)
            console.log('---')

            results.push(schedule)
        }

        await safeLog('backend', 'info', 'service', 'Vehicle maintenance scheduling completed')
        return { success: true, schedule: results }
    } catch (error) {
        await safeLog('backend', 'error', 'service', `Scheduler failed: ${error.message}`)
        console.error(error)
        return { success: false, error: error.message }
    }
}

if (require.main === module) {
    main()
}

module.exports = { main, knapsack }