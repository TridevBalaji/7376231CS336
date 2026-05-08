const VALID_STACKS = ['backend', 'frontend']
const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal']
const BACKEND_PACKAGES = [
    'cache',
    'controller',
    'cron_job',
    'db',
    'domain',
    'handler',
    'repository',
    'route',
    'service'
]
const FRONTEND_PACKAGES = [
    'api',
    'component',
    'hook',
    'page',
    'state',
    'style'
]
const SHARED_PACKAGES = ['auth', 'config', 'middleware', 'utils']

const LOG_API_URL = process.env.LOG_API_URL || 'http://4.224.186.213/evaluation-service/logs'
const LOG_API_KEY = process.env.LOG_API_KEY
const MAX_LOG_MESSAGE_LENGTH = 48

function validate(value, validValues, fieldName) {
    if (typeof value !== 'string') {
        throw new TypeError(`${fieldName} must be a string`)
    }

    const normalized = value.trim().toLowerCase()
    if (!validValues.includes(normalized)) {
        throw new RangeError(`${fieldName} must be one of: ${validValues.join(', ')}`)
    }

    return normalized
}

function getAllowedPackages(stack) {
    if (stack === 'backend') {
        return [...BACKEND_PACKAGES, ...SHARED_PACKAGES]
    }
    if (stack === 'frontend') {
        return [...FRONTEND_PACKAGES, ...SHARED_PACKAGES]
    }
    return SHARED_PACKAGES
}

async function Log(stack, level, packageName, message) {
    const normalizedStack = validate(stack, VALID_STACKS, 'stack')
    const normalizedLevel = validate(level, VALID_LEVELS, 'level')
    const normalizedPackage = validate(packageName, getAllowedPackages(normalizedStack), 'package')

    if (typeof message !== 'string' || message.trim().length === 0) {
        throw new TypeError('message must be a non-empty string')
    }

    const trimmedMessage = message.trim()
    const normalizedMessage = trimmedMessage.length > MAX_LOG_MESSAGE_LENGTH ?
        `${trimmedMessage.slice(0, MAX_LOG_MESSAGE_LENGTH - 3)}...` :
        trimmedMessage

    const payload = {
        stack: normalizedStack,
        level: normalizedLevel,
        package: normalizedPackage,
        message: normalizedMessage
    }

    const headers = {
        'Content-Type': 'application/json'
    }

    if (LOG_API_KEY) {
        headers.Authorization = `Bearer ${LOG_API_KEY}`
    }

    try {
        const fetchImpl = globalThis.fetch
        if (typeof fetchImpl !== 'function') {
            throw new Error('fetch is not available in this Node runtime')
        }

        const response = await fetchImpl(LOG_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const bodyText = await response.text()
            throw new Error(`Log service responded with status ${response.status}: ${bodyText}`)
        }

        const responseBody = await response.json()
        return responseBody
    } catch (error) {
        console.error('Logging middleware failed:', error.message)
        throw error
    }
}

function requestLogger(req, res, next) {
    void Log(
        'backend',
        'info',
        'middleware',
        `Incoming request ${req.method} ${req.originalUrl}`
    ).catch(() => {
        /* Logging should not block request processing */
    })
    next()
}

module.exports = {
    Log,
    requestLogger,
    VALID_STACKS,
    VALID_LEVELS,
    BACKEND_PACKAGES,
    FRONTEND_PACKAGES,
    SHARED_PACKAGES
}