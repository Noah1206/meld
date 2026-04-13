#!/bin/bash
# ─── Meld AI EC2 Instance Setup ──────────
# Run this on a fresh Ubuntu 22.04+ EC2 instance to create the Meld AMI
# After running, create an AMI from this instance for future use
#
# Usage:
#   1. Launch Ubuntu 22.04 t3.medium EC2 instance
#   2. SSH in and run: bash setup-ec2.sh
#   3. After completion, create AMI from AWS Console
#
# Instance requirements:
#   - Ubuntu 22.04 LTS
#   - t3.medium (2 vCPU, 4GB RAM) minimum
#   - 30GB EBS storage
#   - Security group: allow 3000-3100, 9090 inbound

set -euo pipefail

echo "═══ Meld AI EC2 Setup ═══"
echo "Installing all dependencies for the autonomous agent..."

# ─── System Updates ───
echo "[1/8] Updating system..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ─── Node.js 20 ───
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

# ─── pnpm ───
echo "[3/8] Installing pnpm..."
sudo npm install -g pnpm
pnpm --version

# ─── Docker ───
echo "[4/8] Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
docker --version

# ─── Git ───
echo "[5/8] Installing Git..."
sudo apt-get install -y git
git --version

# ─── Playwright + Chromium (for Vision AI) ───
echo "[6/8] Installing Playwright with Chromium..."
sudo npx playwright install-deps chromium
npx playwright install chromium
echo "Playwright installed. Chromium path: $(npx playwright install --dry-run chromium 2>&1 | tail -1)"

# ─── Build tools ───
echo "[7/8] Installing build essentials..."
sudo apt-get install -y build-essential python3 curl wget unzip jq

# ─── Meld Agent Setup ───
echo "[8/8] Setting up Meld Agent Runtime..."
mkdir -p /home/ubuntu/meld
cd /home/ubuntu/meld

# Create startup script
cat > start-agent.sh << 'EOF'
#!/bin/bash
# Meld Agent Startup Script
# Called by systemd or UserData on boot

cd /home/ubuntu/meld/project

# Environment
export MELD_SERVER_URL="${MELD_SERVER_URL:-https://meld-psi.vercel.app}"
export NODE_ENV=production

# Start the agent WebSocket server
if [ -f "node_modules/.bin/meld-agent" ]; then
  npx meld-agent . --port 3100 &
  echo "Meld Agent started on port 3100"
else
  echo "Meld Agent not installed. Run: npm install @figma-code-bridge/agent"
fi

# Keep alive
wait
EOF
chmod +x start-agent.sh

# Create systemd service for auto-start
sudo tee /etc/systemd/system/meld-agent.service > /dev/null << 'EOF'
[Unit]
Description=Meld AI Agent
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/meld
ExecStart=/home/ubuntu/meld/start-agent.sh
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable meld-agent

# ─── Verify Installation ───
echo ""
echo "═══ Setup Complete ═══"
echo ""
echo "Installed:"
echo "  Node.js: $(node --version)"
echo "  pnpm:    $(pnpm --version)"
echo "  Docker:  $(docker --version 2>/dev/null || echo 'installed')"
echo "  Git:     $(git --version)"
echo "  Playwright: installed with Chromium"
echo ""
echo "Next steps:"
echo "  1. Create an AMI from this instance in AWS Console"
echo "  2. Use AMI ID in MELD_EC2_AMI_ID environment variable"
echo "  3. The agent will auto-start when instances launch from this AMI"
echo ""
echo "To test locally:"
echo "  cd /home/ubuntu/meld/project"
echo "  npx meld-agent . --port 3100"
