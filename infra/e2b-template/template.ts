import { Template } from 'e2b'

export const template = Template()
  .fromImage('e2bdev/code-interpreter:latest')
  .setUser('root')
  .setWorkdir('/')
  .runCmd('curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs && npm install -g pnpm@latest')
  .runCmd('apt-get update && apt-get install -y --no-install-recommends git curl wget jq && rm -rf /var/lib/apt/lists/*')
  .runCmd('npx playwright install-deps chromium && npx playwright install chromium')
  .runCmd('npm install -g typescript create-next-app create-vite')
  .runCmd('mkdir -p /home/user/project')
  .setWorkdir('/home/user/project')
  .setUser('user')