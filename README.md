# 课题组设备预约系统 MVP

面向课题组内部学生的响应式设备预约系统。学生可以查看设备、预约时间、取消自己的未来预约并提交设备异常；管理员可以认证成员、维护设备、管理预约和处理异常。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL + RLS
- Server Actions

## 本地运行

1. 安装依赖：`npm install`
2. 在 Supabase 网页控制台的 SQL editor 执行 `supabase/schema.sql`
3. 复制 `.env.example` 为 `.env.local`
4. 填入 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 启动开发服务：`npm run dev`
6. 构建检查：`npm run lint && npm run build && npm run test`

## 环境变量

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目根 URL，例如 `https://your-project.supabase.co`，不要填写 `/rest/v1` 或 `/auth/v1` 路径。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase anon key，可用于浏览器和 SSR。
- `SUPABASE_SERVICE_ROLE_KEY`：仅预留给未来服务端维护脚本，当前应用不读取，也不要暴露到客户端。
- `NEXT_PUBLIC_DEFAULT_TIMEZONE`：默认 `Asia/Shanghai`。

## Supabase migration 使用方式

Supabase SQL editor 不需要下载软件。打开浏览器进入 [Supabase Dashboard](https://supabase.com/dashboard)，选择你的项目，在左侧菜单进入 **SQL Editor**，新建 query，粘贴并执行 `supabase/schema.sql`。

该文件会创建四张核心表、触发器、辅助权限函数、RLS 策略、预约冲突 exclusion constraint 和少量 seed 设备。重新执行是幂等的，适合开发阶段更新策略。

## 检查 Supabase 环境

在 SQL editor 执行：

```sql
select current_database();

select id, email, created_at
from auth.users
order by created_at desc
limit 5;

select email, full_name, role, status
from public.profiles
order by created_at desc
limit 5;

select code, name, status, is_bookable, requires_certification
from public.equipment
order by code;
```

如果 `profiles` 查询报表不存在，说明还没有执行 `supabase/schema.sql`。如果 `auth.users` 有用户但 `profiles` 没有，重新执行新版 `schema.sql` 后，再登录一次，应用会自动为当前账号补建 pending profile。

## 创建第一个管理员

先通过 `/register` 注册第一个账号，然后在 Supabase SQL editor 执行：

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'your-email@example.com';
```

检查是否成功：

```sql
select email, full_name, role, status
from public.profiles
where email = 'your-email@example.com';
```

## MVP 功能清单

- 邮箱密码注册和登录。
- 注册用户默认 `student + pending`。
- pending 用户可以查看设备，并预约 `requires_certification=false` 的开放设备。
- active student 可以预约所有开放设备，包括需要认证的设备。
- disabled 用户被状态页拦截，不能正常使用系统。
- admin 可管理成员、设备、预约和异常反馈。
- 预约服务端检查时间合法性和冲突。
- 数据库用 `btree_gist` exclusion constraint 防止 confirmed 预约并发重叠。
- 手机端优先布局，管理页在窄屏下使用卡片和纵向表单。

## 已知限制

- 不做微信通知、小程序、图片上传、计费、二维码签到和复杂统计；预约支持最多 24 小时的跨天连续时段。
- 已有未来预约不会在设备设为维修中时自动取消，需要管理员手动处理。
- 本地需要连接真实 Supabase 项目才能完整验收数据库和认证流程。

## Vercel 部署

1. 将仓库连接到 Vercel。
2. 在 Vercel Project Settings 配置 `.env.example` 中的变量。
3. 在 Supabase Dashboard 添加 Vercel 域名到 Auth URL 配置。
4. 部署前确认 `npm run build` 通过。
