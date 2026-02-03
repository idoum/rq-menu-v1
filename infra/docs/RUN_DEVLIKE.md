# Running SaaSResto in Dev-Like Mode

This guide explains how to run the SaaSResto application in a "dev-like" environment that mimics production conditions (subdomain routing, reverse proxy) while still using your local machine.

## Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL** running locally
3. **Caddy** reverse proxy installed

### Installing Caddy (Windows)

```powershell
# Using Chocolatey
choco install caddy

# Or download from https://caddyserver.com/download
```

### Installing Caddy (Linux/macOS)

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# macOS
brew install caddy
```

## Step 1: Configure Local DNS

You need to configure your system to resolve `*.saasresto.localhost` to `127.0.0.1`.

### Option A: Edit hosts file (simple, but no wildcards)

Edit your hosts file and add specific tenant entries:

**Windows:** `C:\Windows\System32\drivers\etc\hosts`
**Linux/macOS:** `/etc/hosts`

```
127.0.0.1 saasresto.localhost
127.0.0.1 demo.saasresto.localhost
127.0.0.1 restaurant1.saasresto.localhost
```

### Option B: Use dnsmasq (recommended for wildcards)

```bash
# Linux
sudo apt install dnsmasq
echo "address=/saasresto.localhost/127.0.0.1" | sudo tee /etc/dnsmasq.d/saasresto.conf
sudo systemctl restart dnsmasq

# macOS with Homebrew
brew install dnsmasq
echo "address=/saasresto.localhost/127.0.0.1" >> /usr/local/etc/dnsmasq.conf
sudo brew services start dnsmasq
```

## Step 2: Database Setup

```bash
# Start PostgreSQL (if not running)
# Windows: services.msc -> PostgreSQL
# Linux: sudo systemctl start postgresql

# Create database
psql -U postgres -c "CREATE DATABASE saasresto;"

# Run migrations
npm run db:push

# Seed with demo data
npm run db:seed
```

## Step 3: Environment Configuration

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://postgres:issa@localhost:5432/saasresto?schema=public"

# App
NODE_ENV=development
APP_BASE_DOMAIN=saasresto.localhost
NEXT_PUBLIC_APP_URL=http://saasresto.localhost
```

## Step 4: Start the Application

Open **two terminals**:

### Terminal 1: Start Next.js

```bash
npm run dev
# App will run on http://localhost:3000
```

### Terminal 2: Start Caddy

```bash
# Windows (from project root)
caddy run --config infra/proxy/Caddyfile.devlike

# Linux/macOS
caddy run --config ./infra/proxy/Caddyfile.devlike
```

## Step 5: Access the Application

Open your browser and navigate to:

- **Demo tenant menu:** http://demo.saasresto.localhost
- **Admin backoffice:** http://demo.saasresto.localhost/app/login

### Demo Credentials

```
Email:    demo@demo.com
Password: Demo12345!
```

## Troubleshooting

### "ERR_NAME_NOT_RESOLVED"

Your DNS is not resolving the subdomain. Make sure you've configured the hosts file or dnsmasq.

### "Connection refused"

- Check that Next.js is running on port 3000
- Check that Caddy is running without errors

### "502 Bad Gateway"

- Next.js is not running or crashed
- Check terminal for errors

### Port already in use

```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

### View Caddy logs

```bash
# Caddy shows logs in the terminal where it's running
# For more verbose output:
caddy run --config infra/proxy/Caddyfile.devlike --adapter caddyfile
```

## Development Workflow

1. Make code changes
2. Next.js hot-reloads automatically
3. Caddy continues proxying requests
4. Refresh browser to see changes

## Database Commands

```bash
# View data in browser
npm run db:studio

# Reset database
npm run db:reset

# Create migration
npx prisma migrate dev --name your_migration_name
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Stopping Everything

1. Press `Ctrl+C` in the Caddy terminal
2. Press `Ctrl+C` in the Next.js terminal
