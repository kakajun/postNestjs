# NestJS 改造步骤记录

目标：在 `e:\git\wb\nest` 中用 NestJS 等价实现 `e:\git\wb\platform/service` 的全部对外能力，尽量保持路由、参数与响应一致，前端可零改动切换。

## 1. 项目初始化
- 新建 `nest/package.json`，引入 `@nestjs/*`、`typeorm`、`mysql2`、`class-validator/transformer`、`multer`、`minio`、`sharp`、`jsonwebtoken`。
- 新建 `nest/tsconfig.json`，开启装饰器与元数据。
- 新建 `nest/src/main.ts`，设置全局前缀 `api` 与全局校验管道，默认 8081 端口。
- 新建 `nest/src/app.module.ts`，接入 `@nestjs/config` 与 `@nestjs/typeorm`，数据库使用 `ry-vue`。

## 2. 数据库实体映射
- `nest/src/entities/sys-dict-data.entity.ts` 映射 `sys_dict_data`（字典数据）。
- `nest/src/entities/project.entity.ts` 映射 `t_project`（项目）。
- `nest/src/entities/project-annex.entity.ts` 映射 `t_project_annex`（项目附件）。
- `nest/src/entities/sys-user.entity.ts` 映射 `sys_user`（用户）。
- `nest/src/entities/sys-user-extra.entity.ts` 映射 `sys_user_extra`（用户扩展与地理坐标）。
- `nest/src/entities/user-project.entity.ts` 映射 `t_user_project`（接单记录）。

## 3. 通用基础设施
- `nest/src/common/response.interceptor.ts` 统一响应包裹 `{ code, msg, data, status }`。
- `nest/src/common/auth.decorator.ts` 实现 `@AuthApi(userType)` 装饰器。
- `nest/src/common/auth.guard.ts` 实现基于 JWT 的权限校验，从 `X-Token/Authorization` 解析。
- `nest/src/common/minio.client.ts` 封装 MinIO 客户端（对齐 `application-dev.yaml` 配置）。
- `nest/src/common/jwt.util.ts` 解析 Token 并抽取 `{ userId, userType }`。

## 4. 系统模块
- `nest/src/modules/system/system.module.ts` 注册字典实体。
- `nest/src/modules/system/system.controller.ts` 实现 `GET /api/sys/dict`，默认返回 `sys_technology`。

## 5. 项目模块（第一阶段）
- `nest/src/modules/project/project.module.ts` 注册项目、附件、用户扩展等实体。
- `nest/src/modules/project/project.controller.ts`：
  - `GET /api/project/hall` 支持匿名与经纬度模式，分页返回；经纬度模式下使用原生 SQL 距离过滤；聚合 `annexList`。
  - `GET /api/project/list` 复刻“我发布的项目列表”，支持 `name/publisherId/pageNo/pageSize`；权限 `@AuthApi('01')`。
  - `GET /api/project/detail/:id` 返回项目详情与 `annexList`，过期 URL 清空。

## 6. 文件模块
- `nest/src/modules/file/file.module.ts` 注册附件实体。
- `nest/src/modules/file/file.controller.ts`：
  - `POST /api/file/upload/:projectId` 多图上传到 MinIO，`sharp` 生成缩略图兜底，写入 `t_project_annex`。
  - `GET /api/file/getUrl/:projectId/:imageId` 生成临时访问 URL。
  - `DELETE /api/file/del/:projectId/:imageId` 删除附件记录。

## 7. 项目模块（第二阶段）
- `POST /api/project/take` `ORDER_TAKER` 接单/拒绝，包含距离校验与幂等。
- `GET /api/project/my/take/list` 我的接单列表，聚合发布者信息与附件。
- `PUT /api/project/push` 更新推送状态（需 `PROJECT_PUBLISHER`）。
- `DELETE /api/project/delete/:id` 删除项目并清理附件。

## 8. 项目新增/更新与审核
- `POST /api/project/add` 同一路由支持 JSON 与 multipart（含 `files`），新增附件；限制图片总数 ≤ 3。
- `PUT /api/project/update` 更新项目并追加附件（总数 ≤ 3），审核状态回置为待审核。
- `GET /api/project/my/audit/list` 审核员读取待审核项目列表（字典 `project_auditor` 判断）。
- `PUT /api/project/update/audit` 审核更新（1/2）与备注。

## 9. 关键约定与兼容
- ID 字段统一按字符串返回，前端不受 JS 精度影响。
- 返回分页统一为 `{ records, total, current, size }`，并由拦截器包装统一响应。
- 图片数量限制为 3；过期图片在详情处清空 URL。
- 权限枚举示例：`'01'`（项目发布者）、`'02'`（接单方），与 Java 服务对齐。

## 10. 相关前端改造（辅助）
- `postworkNew/src/pages/index/ProjectHall.vue`：
  - 增加下滑到底部自动分页加载。
  - 定位获取并传入后端，未授权定位时兜底全国项目大厅；提供“开启定位”入口。
  - 列表项布局优化为“文案占满剩余空间 + 箭头右对齐”。

## 11. 平台端一个兼容调整
- 统一 ID 序列化：`platform/service/src/main/java/com/loong/platform/api/module/project/bo/ProjectBo.java` 为 `id` 增加 `ToStringSerializer`，使 `list` 与 `hall` 接口返回一致。

---
以上为从项目初始化到当前的所有主要改造步骤与决策记录，确保 NestJS 端可完全替代 Java 服务对外接口，并保持前端零改动。

