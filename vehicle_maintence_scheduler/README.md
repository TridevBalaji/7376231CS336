# Vehicle Maintenance Scheduler

This microservice fetches depot and vehicle data from the evaluation service APIs, then for each depot, selects the optimal subset of vehicles to maintain within the mechanic hour budget to maximize total impact score.

## Setup

1. Copy `.env.example` to `.env` and add your access token:
   ```
   LOG_API_KEY=your_actual_token_here
   LOG_API_URL=http://4.224.186.213/evaluation-service/logs
   ```

2. Install dependencies (if not already):
   ```bash
   npm install
   ```

## Running

```bash
npm run scheduler
```

This will:
- Fetch depots and vehicles
- Run the scheduling algorithm for each depot
- Log events using the logging middleware
- Output selected vehicles per depot to console

## Algorithm

Uses 0/1 Knapsack dynamic programming to maximize impact score without exceeding mechanic hours.

Time complexity: O(n * W) where n = number of vehicles, W = mechanic hours.