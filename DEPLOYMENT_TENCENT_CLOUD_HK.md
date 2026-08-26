# 腾讯云香港 VPS Docker 部署说明

本文档用于把课题组设备预约系统部署到腾讯云香港 CVM。当前方案是：

- Next.js 应用运行在 Docker 容器内。
- 宿主机 Nginx 负责 HTTPS 和反向代理。
- 数据库和认证继续使用 Supabase。
- 后续迁移到国内备案站点时，可以复用 Docker 镜像和大部分环境变量。

## 1. 购买服务器

推荐初始配置：

- 地域：香港
- 系统：Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS
- 配置：1 核 2GB 起步
- 带宽：按课题组人数选择，MVP 阶段 3-5 Mbps 通常够用
- 安全组开放端口：`22`、`80`、`443`

不建议直接开放 `3000` 到公网。本项目的 `docker-compose.yml` 默认只把容器端口绑定到 `127.0.0.1:3000`，由 Nginx 对外提供访问。

## 2. 初始化服务器

SSH 登录服务器：

```bash
ssh ubuntu@你的服务器公网IP
```

更新系统并安装基础工具：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw nginx
```

安装 Docker：

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

安装 Docker Compose 插件：

```bash
sudo apt install -y docker-compose-plugin
```

退出并重新登录，让 Docker 用户组生效：

```bash
exit
ssh ubuntu@你的服务器公网IP
```

检查版本：

```bash
docker --version
docker compose version
```

## 3. 拉取项目代码

如果 GitHub 仓库是私有仓库，推荐先在 GitHub 创建 deploy key，或用 GitHub CLI 登录。最简单的方式是先用 HTTPS token 克隆：

```bash
git clone https://github.com/<OWNER>/<REPO>.git
cd lab-equipment-booking
```

后续更新代码：

```bash
git pull origin master
```

## 4. 配置生产环境变量

复制示例文件：

```bash
cp .env.production.example .env.production
nano .env.production
```

填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Shanghai
```

当前应用不需要 `SUPABASE_SERVICE_ROLE_KEY` 才能运行。不要把 service role key 暴露到浏览器，也不要提交 `.env.production`。

注意：`NEXT_PUBLIC_*` 变量会被 Next.js 写入前端包，所以构建镜像时也必须注入。本文档中的 `docker compose --env-file .env.production up -d --build` 已经处理这一点。

## 5. 构建并启动 Docker 容器

```bash
docker compose --env-file .env.production up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f web
```

本机测试：

```bash
curl -I http://127.0.0.1:3000/login
```

如果返回 `200` 或 `307/308` 等 HTTP 响应，说明容器已正常启动。

## 6. 配置域名 DNS

在域名服务商处添加解析：

- 类型：A
- 主机记录：例如 `booking`
- 记录值：腾讯云香港服务器公网 IP

例如最终访问地址可以是：

```text
https://booking.example.com
```

DNS 生效后，在服务器测试：

```bash
dig booking.example.com
```

## 7. 配置 Nginx 反向代理

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/lab-equipment-booking
```

写入，并把域名替换成你的正式域名：

```nginx
server {
    listen 80;
    server_name booking.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/lab-equipment-booking /etc/nginx/sites-enabled/lab-equipment-booking
sudo nginx -t
sudo systemctl reload nginx
```

## 8. 配置 HTTPS

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

签发证书：

```bash
sudo certbot --nginx -d booking.example.com
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

## 9. 配置防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

确认 `3000` 没有对公网开放：

```bash
sudo ss -tulpn | grep 3000
```

应看到类似：

```text
127.0.0.1:3000
```

## 10. 配置 Supabase Auth

进入 Supabase Dashboard：

1. Authentication
2. URL Configuration
3. Site URL 填写：

```text
https://booking.example.com
```

4. Redirect URLs 添加：

```text
https://booking.example.com/**
```

如果仍保留 Vercel 作为备用访问入口，也把 Vercel 域名保留在 Redirect URLs 中。

## 11. 更新部署

以后更新代码：

```bash
cd lab-equipment-booking
git pull origin master
docker compose --env-file .env.production up -d --build
docker image prune -f
```

## 12. 常用排查命令

查看应用日志：

```bash
docker compose logs -f web
```

重启应用：

```bash
docker compose restart web
```

查看 Nginx 错误：

```bash
sudo tail -f /var/log/nginx/error.log
```

查看 HTTPS 证书：

```bash
sudo certbot certificates
```

检查服务是否可用：

```bash
curl -I https://booking.example.com/login
```

## 13. 后续迁移到国内备案站点

后期迁移到国内站点时，建议保持以下顺序：

1. 完成域名 ICP 备案。
2. 在国内云服务器部署同一套 Docker 配置。
3. 把 DNS 从香港服务器切到国内服务器。
4. 更新 Supabase Auth 的 Site URL 和 Redirect URLs。
5. 如果 Supabase 在内地访问不稳定，再迁移数据库到国内 PostgreSQL，并逐步替换认证方案。

当前 Docker 配置不绑定腾讯云专有服务，后续迁移到阿里云、腾讯云国内地域或学校服务器都可以复用。
