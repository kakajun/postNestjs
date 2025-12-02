#!/bin/sh
# 启动Nginx
nginx -g 'daemon off;' &
# 启动后端应用
set -a
[ -f "/app/.env" ] && . /app/.env
set +a
export NODE_OPTIONS="--require tsconfig-paths/register"
pm2-runtime dist/main.js
