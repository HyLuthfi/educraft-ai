module.exports = {
  apps: [
    {
      name: 'educraft-backend',
      cwd: 'C:/Users/luthf/projects/educraft-ai/ai-engine',
      script: 'run_pm2.py',
      interpreter: 'C:/Users/luthf/projects/educraft-ai/ai-engine/.venv/Scripts/python.exe',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 8002,
        HOST: '127.0.0.1'
      }
    },
    {
      name: 'educraft-web',
      cwd: 'C:/Users/luthf/projects/educraft-ai',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 20180 -H 0.0.0.0',
      interpreter: 'node',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
