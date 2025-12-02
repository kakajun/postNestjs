# 第一阶段：构建后端应用
FROM docker.m.daocloud.io/library/node:22.17.0 AS builder
WORKDIR /app
ENV CI=true
ENV NODE_ENV=development
COPY . .
RUN npm i -g pnpm && pnpm install  && pnpm run build

# 第二阶段：拉取 GitHub Pages 静态站点
FROM docker.m.daocloud.io/library/alpine:3.20 AS frontend
WORKDIR /usr/app/platform-front
RUN apk add --no-cache curl unzip
ARG GH_OWNER=kakajun
ARG GH_REPO=platform-front
ARG GH_BRANCH=gh-pages
# 下载 gh-pages 分支的代码并解压到工作目录
RUN curl -L "https://codeload.github.com/${GH_OWNER}/${GH_REPO}/zip/refs/heads/${GH_BRANCH}" -o site.zip \
 && unzip site.zip \
 && mv ${GH_REPO}-${GH_BRANCH}/* . \
 && rm -rf ${GH_REPO}-${GH_BRANCH} site.zip
RUN echo "前端拷贝完成"

# 第三阶段：设置 Nginx 和后端环境
FROM docker.m.daocloud.io/library/node:22.17.0-alpine
WORKDIR /app

# 安装 Nginx 和 PM2
RUN apk add --no-cache nginx && npm install -g pm2

# 复制前端文件
COPY --from=frontend /usr/app/platform-front /usr/share/nginx/html

# 复制后端文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env .env


# 写入基础 Nginx 配置
COPY ./nginx.conf /etc/nginx/nginx.conf

# 复制启动脚本并设置权限
COPY --from=builder /app/start.sh /start.sh
RUN chmod +x /start.sh

# 暴露端口
EXPOSE 80 8081

# 启动 Nginx 和后端应用
CMD ["/start.sh"]
