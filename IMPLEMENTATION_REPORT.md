# 课题组设备预约系统 MVP 实现报告

## 已实现功能

- Next.js App Router、TypeScript、Tailwind CSS 项目骨架。
- Supabase Auth 邮箱密码登录/注册，注册后 profile 默认为 `student + pending`。
- Supabase URL 运行时归一化：即使误填 `/rest/v1/`，服务端会使用项目根地址发起 Auth 请求。
- 账号状态分流：未登录进登录页，disabled 进禁用页，pending 用户可以进入系统查看设备。
- 预约权限按设备控制：`requires_certification=false` 的设备注册后即可预约，`requires_certification=true` 的设备需要 active 或 admin。
- 学生端：设备列表、设备详情、预约创建、未来预约修改/取消、异常文字反馈。
- 管理端：设备新增/编辑/停用，成员角色和状态管理，所有预约查看/取消，异常反馈处理并可同步置设备为维修中。
- 管理后台概览：设备数量、待认证成员、今日预约、待处理异常。
- 管理列表筛选：成员按姓名/邮箱/状态，预约按设备/日期/成员/状态，异常按设备/状态/类型。
- 服务端预约校验：30 分钟对齐、不能过去、支持最多 24 小时跨天连续预约、设备可预约、同设备时间段不重叠。
- 数据库约束：`btree_gist` + exclusion constraint 防止 confirmed 预约并发重叠。
- Supabase RLS：学生只能读写自己的预约和反馈，管理员可管理设备、成员、预约、反馈。

## 修改文件概览

- `src/app/**`：App Router 页面和布局。
- `src/components/**`：表单、卡片、状态标签、预约和管理组件。
- `src/lib/**`：Supabase client、数据读取、Server Actions、校验和时间工具。
- `supabase/schema.sql`：数据库表、触发器、RLS、seed 设备。
- `.env.example`：环境变量示例，不包含真实密钥。

## 本地运行

1. `npm install`
2. 在 Supabase SQL editor 执行 `supabase/schema.sql`
3. 复制 `.env.example` 为 `.env.local` 并填写 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `npm run dev`

## 手机端适配情况

- 页面采用 mobile-first 单列布局，按钮高度至少 44px。
- 预约页使用日期 + 开始/结束时间纵向表单，避免手机端横向大表格。
- 管理后台在窄屏下以卡片和纵向表单呈现，桌面端自然扩展为多列。
- 已用生产构建 `npm run build` + `npm run start` 在 375px 视口检查公开页面：
  - `/login`：`innerWidth=375`，`documentElement.scrollWidth=375`，主按钮高度 44px。
  - `/register`：`innerWidth=375`，`documentElement.scrollWidth=375`，主按钮高度 44px。
  - `/pending`：`innerWidth=375`，`documentElement.scrollWidth=375`，主按钮高度 44px。
  - `/disabled`：`innerWidth=375`，`documentElement.scrollWidth=375`，主按钮高度 44px。
- 内部页面需要真实 Supabase 环境变量和用户会话才能浏览器端实测；本阶段已通过生产构建覆盖路由和类型检查。

## 学生端使用流程

1. 注册账号后进入 `/dashboard` 查看状态和近期预约。
2. 进入 `/equipment` 选择设备。
3. 如果设备标记为“注册后即可预约”，pending 用户也可以预约。
4. 如果设备标记为“需要管理员认证后预约”，需要管理员将账号设为 active 后才能预约。
5. 在设备详情页选择日期、开始时间、结束时间并填写用途。
6. 在 `/bookings` 查看、修改或取消自己的未来预约。

## 管理员端使用流程

1. 进入 `/admin` 查看概览。
2. 在 `/admin/members` 认证 pending 成员、设为 admin、禁用或恢复用户。
3. 在 `/admin/equipment` 新增或编辑设备，调整 `status` 和 `is_bookable`。
4. 在 `/admin/bookings` 查看和取消未来预约。
5. 在 `/admin/issues` 处理异常反馈，并可一键将设备设为维修中。

## 数据库和 RLS 简述

- `profiles` 由 auth trigger 自动创建，默认 `student + pending`。
- `equipment` 保存设备基础信息、状态和预约开关。
- `bookings` 保存预约与取消信息，使用 exclusion constraint 防重叠。
- `issue_reports` 保存文字异常反馈和管理员处理记录。
- RLS 限制学生只能访问自己的预约/反馈，管理员可管理所有资源。
- RLS 允许 pending 用户读取设备；创建预约时会检查设备是否 normal、is_bookable 且是否需要认证。

## 如何创建第一个管理员

注册账号后在 Supabase SQL editor 执行：

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'your-email@example.com';
```

## Vercel 部署

在 Vercel 配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_DEFAULT_TIMEZONE`。不要把 service role key 暴露到客户端。

## 二期建议

- 邮件或企业微信通知。
- 设备使用记录和统计。
- 管理员操作审计。
- 设备培训/资质细分。
- 图片附件和维修工单。

## 未完成和已知问题

- 尚未接入真实 Supabase 项目，需用户提供环境变量并执行 SQL。
- MVP 不包含图片上传、审批流、计费、二维码签到和复杂统计；跨天连续预约已支持，重复预约仍不做批量规则。
- 第一个管理员需要在 Supabase SQL editor 中手动将对应 profile 改为 `role='admin', status='active'`。
