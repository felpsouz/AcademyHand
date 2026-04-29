module.exports = {
  apps: [{
    name: 'academyhand',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};