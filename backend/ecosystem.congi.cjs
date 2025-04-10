// filepath: /Users/jonathanhapp/Documents/GitHub/concert-poster-marketplace/backend/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "poster-m",
      script: "./dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
