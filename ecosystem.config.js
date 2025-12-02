module.exports = {
    apps: [
        {
            name: "pjr-api",
            script: "./server.js",
            instances: 1, // Single instance is enough for this workload; avoids race conditions on file writes
            autorestart: true,
            watch: false, // Don't restart on file changes (especially cache.json)
            max_memory_restart: "300M", // Raspberry Pi friendly
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
