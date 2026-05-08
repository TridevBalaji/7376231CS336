require('dotenv').config()
const express = require('express')
const { requestLogger } = require('./logging_middleware/logger')
const { main: runScheduler } = require('./vehicle_maintence_scheduler/scheduler')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(requestLogger)

app.get('/', (req, res) => {
    res.json({ message: 'Vehicle maintenance scheduler API is running' })
})

app.post('/api/vehicle-schedule', async(req, res) => {
    const { depotIds } = req.body

    try {
        const result = await runScheduler({ depotIds })
        res.json(result)
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
})