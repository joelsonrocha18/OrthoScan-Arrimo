const { spawn } = require('child_process')
const path = require('path')
const waitOn = require('wait-on')

const root = path.join(__dirname, '..')
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const devUrl = 'https://localhost:5173'

const vite = spawn(
  npmCmd,
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'],
  { cwd: root, stdio: 'inherit', env: process.env },
)

function cleanup() {
  if (!vite.killed) vite.kill()
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

waitOn({ resources: ['tcp:5173'], timeout: 120000 })
  .then(() => {
    const electron = spawn(
      npmCmd,
      ['exec', 'electron', '--', 'desktop/main.cjs'],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          ELECTRON_START_URL: devUrl,
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
        },
      },
    )

    electron.on('exit', () => cleanup())
  })
  .catch((err) => {
    console.error('Falha ao iniciar o servidor:', err)
    cleanup()
    process.exit(1)
  })
