const logger = {
    info: (msg, data) => console.log(`ℹ️  INFO: ${msg}`, '\n', data),
    warn: (msg, data) => console.warn(`⚠️  WARN: ${msg}`, '\n', data),
    success: (msg, data) => console.warn(`✅  SUCCESS: ${msg}`, '\n', data),
    error: (msg, data) => console.error(`❌ ERROR: ${msg}`, '\n', data),
};

export default logger