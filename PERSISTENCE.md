# 离线备份与恢复 · 寒渊七境

完整目录 `index.html`＋`assets/` 或完整单文件 `baiyao-standalone.html` 均可离线游玩，无需发布云环境。工作区路径不是聊天附件；远程备份以 GitHub `YONGLINGZ/CC` 的实际提交及下载核验为准。

## 本局与角色解锁

本局生命、金币、牌组、包裹、剑器、历练、七十段路线、剧情与持续状态不保存，刷新或重开会重置。角色解锁单独保存在浏览器 `localStorage`，键为 `baiyao-night-profile-v1`，不上传网络。

首页及声画设置中的“解锁凭证”可复制 JSON 并在别处载入，只接受版本 1 与已知解锁字段，不导入本局数值。浏览器拒绝本地保存时会提示使用凭证。更换 HTML 位置、浏览器或设备前应先复制；恢复脚本不包含玩家自己的解锁记录。

正在进行的一局会请求浏览器的离页确认。`beforeunload` 在用户交互后、浏览器允许时可触发原生提示；`pagehide` 只能作尽力处理，不能可靠取消离开，尤其不能保证移动 Safari 或系统回收页面时弹框。这两个监听都不写存档、不联网。

## v11 恢复内容

- `recovery/restore.sh`：十份构建源码及258张声明的本地图片，重建目录版与完整单文件。
- `recovery/restore-source.sh`：同样十份源码，不含图片；重建可玩的 SVG 后备版本。

源码包括 `dev/seven.js` 中的七境、九位镇境者和新奇遇数据。素材名单根据游戏声明生成，不能通过遗漏文件悄悄缩减打包范围。完整包共268个源码／图片输入，各文件哈希见当前恢复清单。

在目标空目录运行：

```sh
BAIYAO_RESTORE_ROOT=/绝对路径 sh restore.sh
# 无图源码包则改用 restore-source.sh
```

恢复需要 POSIX shell、Python 3、Node.js；游玩成品只需要浏览器。脚本只补缺失文件，遇到用户修改或符号链接会在写入前拒绝；同版本重复执行不改写已有文件。`manifest.json`、`source-manifest.json` 绑定输入与产物的 SHA256。

## 当前验收状态

v11 已实际通过完整恢复 **17/17**、无图源码恢复 **21/21**、恢复后三职业首战与选牌 **3/3**、HTML真实下载与独立重开 **4/4**。成品 Chromium **18/18** 组通过，包括七境七十节点公开按钮整局、258张图片解码、完整单文件零网络请求和缺图后备。报告见 `recovery/tests.json`、`recovery/source-tests.json`、`dev/v11-source-browser-results.json`、`dev/v11-export-results.json` 与 `dev/v11-results.json`；实际范围与未达数值目标见 `TESTING.md`。

`--backup` 的同一实例副本不保证跨实例存在。本版未据此宣称已发布云环境、修改配置或完成全新云实例恢复。旧版文档见 `dev/v10-*.md`，历史云配置记录只对其注明版本有效。
