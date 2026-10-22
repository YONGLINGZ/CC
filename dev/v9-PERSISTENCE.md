# 离线备份与恢复 · 蚀心长夜版

完整目录 `index.html`＋`assets/` 或完整单文件 `baiyao-standalone.html` 均可离线游玩，无需发布云环境。工作区路径不是聊天附件；远程备份以 GitHub `YONGLINGZ/CC` 的实际提交和下载核验为准。

## 本局与角色解锁

本局生命、金币、牌组、装备、历练、三十段路线、剧情与持续状态都不保存，刷新或重开会重置。角色解锁单独保存在浏览器 `localStorage`，键为 `baiyao-night-profile-v1`，不上传网络。

首页及声画设置的“解锁凭证”可复制 JSON 并在别处载入，只接受版本 1 与已知解锁字段，不导入本局数值。浏览器拒绝本地保存时会提示使用凭证。更换 HTML 位置、浏览器或设备前应先复制；恢复脚本不包含玩家自己的解锁记录。

## v9 恢复内容

- `recovery/restore.sh`：8 份构建源码及绑定数据、233 张运行 WebP，恢复后重建目录版与完整单文件。
- `recovery/restore-source.sh`：同样 8 份源码，不含图片；重建 SVG 后备版本，可游玩全部规则。

资源包括 70 张技能、职业事件画面与现有 21 张剑修事件变体。状态与地图图标包含在 SVG 源码中，无需新增 WebP。静态人物图不等于 Live2D 模型，恢复包不加载旧三维或网格立绘模块。

在目标空目录运行：

```sh
BAIYAO_RESTORE_ROOT=/绝对路径 sh restore.sh
# 无图源码包则改用 restore-source.sh
```

恢复需要 POSIX shell、Python 3、Node.js；游玩成品只需要浏览器。脚本只补缺失文件，遇到用户修改或符号链接会在写入前拒绝；同版本重复执行不改写已有文件。`manifest.json`、`source-manifest.json` 绑定每个输入及产物的 SHA256，完整包共 241 个输入。

## 当前验收状态

v9 完整恢复 **17/17**、无图源码恢复 **21/21**、恢复后三职业首战 **3/3**、完整 HTML 实际下载与重开 **4/4** 均已执行通过，报告分别为 `recovery/tests.json`、`recovery/source-tests.json`、`dev/v9-source-browser-results.json`、`dev/v9-export-results.json`。最终成品浏览器 **10/10 组通过**，含剑修公开按钮三十节点整局，报告为 `dev/v9-results.json`。报告与清单绑定冻结 v9 源码及产物哈希；种子自动操作不等于人工平衡评价，详细范围及历史本地 URL 限制见 `TESTING.md`。

`--backup` 的同一实例副本不能保证跨实例存在。本版没有据此修改、发布或在全新实例验证云配置。`recovery/cloud-v4-status.json` 仅为历史证据；上一版文档已保存在 `dev/v8-*.md`，旧报告仍只对相应历史构建有效。
