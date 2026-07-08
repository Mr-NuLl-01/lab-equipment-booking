# Codex 模板化部署指南

本文档用于把本项目重新打包为可 fork 的课题组设备预约系统模板，并指导另一个课题组的 Codex 自主完成 GitHub、Supabase、Vercel、Cloudflare 和域名配置。

推荐模式是一课题组一套部署：

- 一个独立 GitHub 仓库
- 一个独立 Supabase 项目
- 一个独立 Vercel 项目
- 一个独立域名或子域名

不要让多个课题组共用同一个 Supabase 项目，除非后续明确改造成多租户系统。

## 一、模板仓库打包方式

在原项目维护者账号中执行：

1. 确认不包含真实密钥：
   ```bash
   git status --short
   git ls-files | grep -E '(^|/)(\\.env|\\.env\\.local|\\.vercel/)'
   ```
   正常情况下第二条不应输出任何已跟踪的真实环境文件。

2. 确认构建通过：
   ```bash
   npm install
   npm run lint
   npm run test -- --run
   npm run build
   git diff --check
   ```

3. 在 GitHub 创建一个新仓库，例如：
   `lab-equipment-booking-template`

4. 如果希望别人能直接 fork：
   - 可以设为 Public。
   - 如果只给合作课题组使用，可以设为 Private，并把对应成员加入协作者。
   - 在 GitHub 仓库设置里启用 Template repository，别人可用 Use this template 创建副本。

5. 推送模板仓库：
   ```bash
   git remote -v
   git remote set-url origin https://github.com/<OWNER>/lab-equipment-booking-template.git
   git push -u origin master
   ```

6. 确认这些文件存在：
   - `.env.example`
   - `README.md`
   - `supabase/schema.sql`
   - `docs/CODEX_TEMPLATE_DEPLOYMENT.md`
   - `package-lock.json`

## 二、给使用者的前置准备

使用者需要准备：

- GitHub 账号
- Supabase 账号
- Vercel 账号
- Cloudflare 账号
- 一个域名，例如 `example-lab.org`

建议使用者先把这些连接器接入 Codex：

- GitHub connector
- Supabase connector
- Vercel connector
- Cloudflare connector

如果没有 connector，也可以让 Codex 生成 SQL、CLI 命令和网页控制台操作步骤，由人手动执行。

## 三、给另一个 Codex 的执行任务书

把下面整段复制给新课题组的 Codex：

```text
你要帮助我把这个课题组设备预约系统部署为我自己的版本。

目标：
1. 使用当前 fork 后的 GitHub 仓库作为代码源。
2. 新建或连接我自己的 Supabase 项目。
3. 在 Supabase 执行 supabase/schema.sql，建立数据库、RLS、触发器和 seed 设备。
4. 新建或连接我自己的 Vercel 项目。
5. 配置 Vercel 环境变量。
6. 使用 Cloudflare 管理我的域名 DNS。
7. 让我的域名指向 Vercel，并设置为 DNS only，不开启 Cloudflare 代理，除非确认当前架构支持代理。
8. 注册第一个管理员账号，并通过 SQL 提升为 admin + active。
9. 验证登录、设备列表、预约、防冲突、维护窗口、管理员后台可用。

请自主执行，不要因为小问题中断询问我。遇到不明确问题时采用以下默认值：
- 时区使用 Asia/Shanghai。
- 邮箱密码登录。
- 注册后默认 student + pending。
- 第一个管理员由 SQL 手动提升。
- Supabase service role key 只放在 Vercel 服务端环境变量里，不在客户端暴露。
- Cloudflare DNS 初期使用 DNS only。
- Vercel 作为应用托管平台。
- Supabase 作为认证和数据库。

请按以下阶段执行：

Stage A：检查仓库
- 运行 npm install。
- 检查 .env.example。
- 确认没有提交 .env.local、.vercel、node_modules、.next。
- 运行 npm run lint、npm run test -- --run、npm run build、git diff --check。

Stage B：Supabase
- 创建或选择 Supabase 项目。
- 获取 Project URL 和 anon key。
- 在 SQL Editor 或 Supabase MCP 中执行 supabase/schema.sql。
- 确认 public.profiles、public.equipment、public.bookings、public.issue_reports、public.maintenance_tasks、public.maintenance_windows、public.equipment_permissions、public.equipment_maintenance_links 都存在。
- 确认 RLS 已启用。
- 在 Supabase Auth 设置中启用邮箱密码登录。
- 根据课题组习惯决定是否关闭邮箱确认。MVP 阶段建议关闭邮箱确认，避免学生无法登录。

Stage C：Vercel
- 创建 Vercel 项目并连接 GitHub 仓库。
- Framework 选择 Next.js。
- Build command 使用 npm run build。
- Install command 使用 npm install。
- 配置环境变量：
  NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
  SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
  NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Shanghai
- 注意：SUPABASE_SERVICE_ROLE_KEY 不要加 NEXT_PUBLIC_。
- 部署生产环境。

Stage D：域名和 Cloudflare
- 在 Vercel 添加自定义域名。
- 在 Cloudflare DNS 添加 Vercel 要求的记录。
- 根域常见配置是 A 记录指向 Vercel 提供的地址，或按 Vercel 页面提示设置。
- www 子域通常用 CNAME 指向 Vercel 提供的目标。
- 初期全部设置为 DNS only，不开启橙色云代理。
- 等 Vercel 显示域名 Valid Configuration。
- 访问 https://我的域名/login。

Stage E：Supabase Auth 回调地址
- 在 Supabase Auth URL Configuration 中设置 Site URL 为生产域名。
- Redirect URLs 添加：
  https://我的域名/**
  http://localhost:3000/**

Stage F：创建第一个管理员
- 打开 /register 注册第一个账号。
- 在 Supabase SQL Editor 执行：
  update public.profiles
  set role = 'admin', status = 'active'
  where email = '我的管理员邮箱';
- 再登录 /admin 验证管理员后台。

Stage G：上线验收
- 学生注册后能登录。
- pending 学生能查看设备。
- admin 能认证成员。
- admin 能给学生逐台授权设备。
- normal + is_bookable=true 的设备能预约。
- 维护窗口时间段显示红色维护中且不能预约。
- 重叠预约被阻止，相邻预约允许。
- admin 能新增设备、维护提醒、维护窗口、异常处理。

最后请输出：
1. GitHub 仓库地址。
2. Supabase 项目 ref。
3. Vercel 项目地址。
4. 生产域名。
5. 已配置的环境变量名称，不输出密钥值。
6. 第一个管理员邮箱。
7. 验收结果。
8. 仍需人工完成的步骤。
```

## 四、Supabase 手动 SQL 检查

如果 Codex 已连接 Supabase MCP，可以让它直接执行迁移。否则让使用者在 Supabase Dashboard 的 SQL Editor 执行 `supabase/schema.sql`。

执行后检查：

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select code, name, status, is_bookable, requires_certification
from public.equipment
order by code;
```

第一个管理员提升：

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'admin@example.com';
```

如果管理员账号还没有 profile，先登录一次应用，或手动补建：

```sql
insert into public.profiles (id, email, full_name, role, status)
select id, email, coalesce(raw_user_meta_data->>'full_name', ''), 'admin', 'active'
from auth.users
where email = 'admin@example.com'
on conflict (id) do update
set role = 'admin', status = 'active';
```

## 五、Vercel 环境变量清单

必须配置：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Shanghai
```

安全要求：

- 不要把 `SUPABASE_SERVICE_ROLE_KEY` 写进 `.env.example` 的真实值。
- 不要创建或提交 `.env.local`。
- 不要把 service role key 命名为 `NEXT_PUBLIC_*`。
- Vercel 中 Production、Preview、Development 环境可先使用同一套 Supabase，正式使用前建议至少区分 production 和 development。

## 六、Cloudflare 和域名建议

初期使用 Vercel 托管时，Cloudflare 只做 DNS：

- DNS 记录按 Vercel 项目域名页面提示添加。
- Proxy status 设为 DNS only。
- 等 Vercel 证书签发完成后再访问生产域名。

不建议初期直接用 Cloudflare Pages 部署本项目，除非已经确认 Next.js App Router、Server Actions、Supabase SSR cookie 行为在目标 Cloudflare Runtime 下完全兼容。

如果将来要提升中国内地访问体验：

- 短期：选择香港或新加坡区域的 Supabase，Vercel + Cloudflare DNS only。
- 中期：将图片、静态资源和文档类内容放 CDN。
- 长期：如需要国内大陆加速和合规访问，准备 ICP 备案并迁移到国内云厂商或支持备案的部署方案。

## 七、适配新课题组时优先修改的位置

推荐只改这些：

- `README.md`：项目名称、课题组说明。
- `supabase/schema.sql` seed 部分：默认设备、默认维护提醒。
- 管理后台 `/admin/equipment`：上线后用 UI 添加设备和维护联动。
- Vercel 环境变量。
- Supabase Auth URL 配置。
- Cloudflare DNS。

不建议在初始部署时改这些：

- RLS 策略。
- 预约冲突 exclusion constraint。
- Supabase service role key 使用方式。
- Server Actions 的权限检查。

## 八、交付前检查清单

本地：

```bash
npm run lint
npm run test -- --run
git diff --check
npm run build
```

线上：

- `/login` 能打开。
- `/register` 能注册。
- `/equipment` 能显示设备。
- `/admin` 非管理员无法访问。
- 管理员可进入 `/admin`。
- 能创建一个 30 分钟预约。
- 同设备重叠预约被拒绝。
- 能创建维护窗口。
- 维护窗口时段在预约表中显示红色“维护中”。
- Cloudflare DNS 为 DNS only。
- Supabase Auth Site URL 和 Redirect URLs 已匹配生产域名。

## 九、推荐仓库说明文字

GitHub repository description 可以写：

```text
Mobile-first lab equipment booking system built with Next.js, Supabase, Tailwind CSS, and Vercel.
```

README 顶部可说明：

```text
这是一个课题组设备预约系统模板。Fork 后按 docs/CODEX_TEMPLATE_DEPLOYMENT.md 配置 Supabase、Vercel、Cloudflare 和域名，即可部署为自己的课题组版本。
```
