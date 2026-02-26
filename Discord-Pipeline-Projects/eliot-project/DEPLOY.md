# LarvalBase V2 — Deployment Guide

## VPS Details

| Field | Value |
|-------|-------|
| **Host** | 69.62.106.38 |
| **URL** | https://larvalbase.ingevision.cloud |
| **Remote path** | `/var/www/eliot/` |
| **SSH user** | root |
| **Process manager** | pm2 (process name: `eliot`) |
| **Node version** | 22.x (via nvm) |
| **Reverse proxy** | Traefik |

## Quick Deploy (from Windows)

Run from the `eliot-project/app/` directory:

```bash
# 1. Sync files to VPS (tar over SSH — no rsync on Windows)
tar -czf - \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='vitest.config.ts' \
  --exclude='*/__tests__' \
  . | ssh root@69.62.106.38 "cd /var/www/eliot && tar -xzf - --overwrite"

# 2. Install dependencies + build + restart
ssh root@69.62.106.38 "cd /var/www/eliot && npm install && npm run build && export PATH=\$PATH:/root/.nvm/versions/node/v22.14.0/bin && pm2 restart eliot"
```

## Step-by-Step

### 1. Sync files

The VPS does NOT use git. Files are deployed via tar+SSH:

```bash
cd "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\Discord-Pipeline-Projects\eliot-project\app"
tar -czf - \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='vitest.config.ts' \
  --exclude='*/__tests__' \
  . | ssh root@69.62.106.38 "cd /var/www/eliot && tar -xzf - --overwrite"
```

### 2. Install dependencies

```bash
ssh root@69.62.106.38 "cd /var/www/eliot && npm install"
```

### 3. Build

```bash
ssh root@69.62.106.38 "cd /var/www/eliot && npm run build"
```

### 4. Restart

```bash
ssh root@69.62.106.38 "export PATH=\$PATH:/root/.nvm/versions/node/v22.14.0/bin && pm2 restart eliot"
```

### 5. Verify

```bash
ssh root@69.62.106.38 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/"
# Should return: 200
```

Or visit: https://larvalbase.ingevision.cloud

## pm2 Commands (on VPS)

```bash
pm2 list              # Show all processes
pm2 restart eliot     # Restart
pm2 logs eliot        # View logs
pm2 stop eliot        # Stop
pm2 show eliot        # Process details
```

## Notes

- pm2 path may need: `export PATH=$PATH:/root/.nvm/versions/node/v22.14.0/bin`
- The pm2 config: `script: /usr/bin/npm`, `args: start`, `cwd: /var/www/eliot`
- No `.env` file needed — the app has no secrets
- Test files (`__tests__/`, `vitest.config.ts`) are excluded from deploy
