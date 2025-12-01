# 使用与功能说明

本说明覆盖 NestJS 服务的运行方式、配置、权限与接口功能，目标与 `platform/service` Java 服务保持一致，前端可零改动切换。

## 环境要求
- Node.js ≥ 18
- MySQL（库：`ry-vue`）
- MinIO（对象存储）

## 配置
通过环境变量配置，若不设置则使用内置默认：
- `DB_HOST`（默认 `127.0.0.1`）
- `DB_PORT`（默认 `3306`）
- `DB_USER`（默认 `root`）
- `DB_PASS`（默认 `123123`）
- `DB_NAME`（默认 `ry-vue`）
- `MINIO_ENDPOINT`（默认 `http://oss.api.huizetech.cn`）
- `MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`
- `MINIO_BUCKET`（默认 `wb-bucket`）
- `MINIO_EXPIRE`（默认 `3600` 秒）
- `JWT_SECRET`（默认 `wb-secret`）

## 启动
在 `e:\git\wb\nest` 下：
```bash
npm install
npm run dev
```
服务默认监听 `8081` 端口，统一前缀为 `api`。

## 权限与头部
- 令牌头部：`X-Token` 或 `Authorization: Bearer <token>`
- 装饰器：`@AuthApi(userType)` 与 Guard 控制接口访问
- 约定示例：`'01'` 为项目发布者，`'02'` 为接单方；审核员由 `sys_dict_data` 的 `project_auditor` 判定

## 通用规范
- ID 统一以字符串返回
- 分页返回结构：`{ records, total, current, size }`，由拦截器包装为 `{ code, msg, data, status }`
- 图片数量限制：单项目最多 3 张；详情中过期图片 URL 清空

## 接口

### 系统字典
- `GET /api/sys/dict?code=xxx`
  - 默认 `code=sys_technology`
  - 字段：`dictCode、fatherId、dictType、dictSort、dictLabel、dictValue、status`

### 项目大厅
- `GET /api/project/hall`
  - 入参：`pageNo、pageSize、distance（默认200000）、longitude、latitude`
  - 有经纬度：按距离筛选附近项目；无经纬度：返回开放且审核通过的项目
  - 返回记录包含 `annexList`
  - 参考：`nest/src/modules/project/project.controller.ts:28`

### 我发布的项目列表
- `GET /api/project/list`
  - 入参：`name、pageNo、pageSize、publisherId`
  - 需权限：`@AuthApi('01')`
  - 参考：`nest/src/modules/project/project.controller.ts:82`

### 项目详情
- `GET /api/project/detail/:id`
  - 返回 `annexList`，过期图片 URL 清空
  - 参考：`nest/src/modules/project/project.controller.ts:106`

### 新增项目
- `POST /api/project/add`
  - 模式1：`Content-Type: application/json`，仅保存主体
  - 模式2：`multipart/form-data`，字段：`projectName、technology、request、category` + `files[]`（≤3）
  - 参考：`nest/src/modules/project/project.controller.ts:136`

### 更新项目
- `PUT /api/project/update`
  - 支持追加附件（总数 ≤ 3），审核状态重置为待审核
  - 参考：`nest/src/modules/project/project.controller.ts:163`

### 推送开关
- `PUT /api/project/push`
  - 入参：`id、status`
  - 需权限：`@AuthApi('01')`
  - 参考：`nest/src/modules/project/project.controller.ts:116`

### 删除项目
- `DELETE /api/project/delete/:id`
  - 清理附件记录
  - 需权限：`@AuthApi('01')`
  - 参考：`nest/src/modules/project/project.controller.ts:127`

### 接单与我的接单
- `POST /api/project/take`
  - 入参：`projectId、status、distance`；需权限：`@AuthApi('02')`
  - 幂等与距离校验
  - 参考：`nest/src/modules/project/project.controller.ts:220`
- `GET /api/project/my/take/list`
  - 聚合发布者信息与附件
  - 需权限：`@AuthApi('02')`
  - 参考：`nest/src/modules/project/project.controller.ts:242`

### 审核相关
- `GET /api/project/my/audit/list`
  - 审核员判定：`sys_dict_data.project_auditor`
  - 参考：`nest/src/modules/project/project.controller.ts:189`
- `PUT /api/project/update/audit`
  - 入参：`projectId、audit（1/2）、remark`
  - 参考：`nest/src/modules/project/project.controller.ts:207`

### 文件模块
- `POST /api/file/upload/:projectId`（`files[]`）
  - 存储到 MinIO，缩略图 `sharp` 生成兜底
  - 参考：`nest/src/modules/file/file.controller.ts:12`
- `GET /api/file/getUrl/:projectId/:imageId`
  - 临时 URL
  - 参考：`nest/src/modules/file/file.controller.ts:36`
- `DELETE /api/file/del/:projectId/:imageId`
  - 删除附件记录
  - 参考：`nest/src/modules/file/file.controller.ts:44`

## 兼容说明
- 与 Java 服务的字段、路径和响应结构保持一致；ID 统一字符串；分页结构统一；图片数量限制为 3。
- 审核员与权限模型按现有字典与用户类型实现；可与登录发放的 Token 集成。

## 常见问题
- MinIO 连接失败：检查 `MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET` 是否正确；端口与协议（http/https）是否匹配。
- 图片无法生成缩略图：`sharp` 会自动兜底为原始字节；不影响接口成功返回。
- Token 无法解析：确认头部使用 `X-Token` 或 `Authorization`，并配置一致的 `JWT_SECRET`。

