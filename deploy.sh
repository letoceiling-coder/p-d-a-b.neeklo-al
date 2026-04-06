#!/bin/bash

set -e

echo "=== GIT STATUS ==="
git status

echo "=== PUSH ==="
git add .
git commit -m "auto deploy $(date +%s)" || true
git push origin main

echo "=== CONNECT SERVER ==="
ssh root@89.169.39.244 << 'EOF'

cd /var/www/p-d-a-b.neeklo.ru

echo "=== GIT PULL ==="
git pull origin main

echo "=== INSTALL ==="
npm install

echo "=== PRISMA ==="
npx prisma generate
npx prisma db push
npx prisma db seed || true

echo "=== PM2 RESTART ==="
pm2 restart pdab-api --update-env

echo "=== BUILD UI ==="
cd admin-ui
npm install
npm run build

echo "=== DEPLOY UI ==="
rm -rf /var/www/p-d-a-b.neeklo.ru/web/*
cp -r dist/* /var/www/p-d-a-b.neeklo.ru/web/

echo "=== NGINX ==="
nginx -t
systemctl reload nginx

echo "=== DONE ==="

EOF

echo "=== DEPLOY COMPLETE ==="
