# 离线备份与恢复 · 寒渊七境

2026.10.26版本：恢复源新增mechanist.js、story-v5.js、story-factions-v5.js、story-bosses-v5.js。运行资源跟随构建清单，新角色69幅正式资源及兼容肖像同包；旧下载名baiyao-rebuilt.zip继续与当前目录ZIP一致。

完整目录 `index.html`＋`assets/` 或完整单文件 `baiyao-standalone.html` 均可离线游玩，无需发布云环境。工作区路径不是聊天附件；远程备份以 GitHub `YONGLINGZ/CC` 的实际提交及下载核验为准。

批次 A 已更新入口和资源显示；批次 B 的版本化单局存档尚未实现。下述“恢复”是恢复游戏文件，不是恢复正在进行的一局。

## 本局与角色解锁

本局生命、灵石、牌组、包裹、剑器、衣囊及穿着、历练、七十段路线、剧情与持续状态不保存，刷新或重开会重置。角色解锁单独保存在浏览器 `localStorage`，键为 `baiyao-night-profile-v1`，不上传网络。

声画设置及解锁结算中的“解锁凭证”可复制 JSON 并在别处载入，只接受版本 1 与已知解锁字段，不导入本局数值。浏览器拒绝本地保存时会提示使用凭证。更换 HTML 位置、浏览器或设备前应先复制；恢复脚本不包含玩家自己的解锁记录。

正在进行的一局会请求浏览器的离页确认。`beforeunload` 在用户交互后、浏览器允许时可触发原生提示；`pagehide` 只能作尽力处理，不能可靠取消离开，尤其不能保证移动 Safari 或系统回收页面时弹框。这两个监听都不写存档、不联网。

## 当前恢复内容

- `recovery/restore.sh`：16份构建输入及497张声明的本地图片，重建目录版与完整单文件。
- `recovery/restore-source.sh`：同样16份构建输入，不含图片；重建可玩的 SVG 后备版本。

源码包括 `dev/seven.js` 中的七境、九位镇境者，以及 `dev/tales.js` 中的十套连续剧情与 `dev/boss-quests.js` 中的十四条镇境旧事、`dev/hehuan.js` 中的晏绮罗角色与三段个人线，以及 `dev/expansion.js` 中的五套衣装与禁术链。素材名单根据游戏声明生成，不能通过遗漏文件悄悄缩减打包范围。合欢角色的卡图、事件图、照心镜和三档立绘也在运行资源名单中；完整输入数量以本次构建清单为准。

在目标空目录运行：

```sh
BAIYAO_RESTORE_ROOT=/绝对路径 sh restore.sh
# 无图源码包则改用 restore-source.sh
```

恢复需要 POSIX shell、Python 3、Node.js；游玩成品只需要浏览器。脚本只补缺失文件，遇到用户修改或符号链接会在写入前拒绝；同版本重复执行不改写已有文件。`manifest.json`、`source-manifest.json` 绑定输入与产物的 SHA256。

## 当前验收范围

当前恢复检查覆盖16份构建输入与497张声明图片、缺图源码后备、重复执行、冲突文件和符号链接保护。实际结果以 `recovery/tests.json`、`recovery/source-tests.json` 的当前产物哈希为准。当前游戏包另由 `dev/release-package-check.cjs` 解压、启动并读取两个36牌图鉴，结果见 `dev/release-package-results.json`。旧 `dev/v11-source-browser-results.json`、`dev/v11-export-results.json` 和 `dev/v11-results.json` 为其各自版本的历史浏览器记录。

衣装与新禁术的专项记录在 `dev/wardrobe-blood-browser-results.json`；图片来源与哈希见 `dev/wardrobe-art-manifest.json`、`dev/story-boss-art-manifest.json`。五套衣装各有物品、夜铃、沈霜白及异变沈霜白四张原画。运行版将这些素材纳入完整单文件，源码无图恢复则使用可玩的后备图。

本文更新于2026-10-25（北京时间）。右上角版本号应为2026.10.25-r36.2。两个游戏ZIP地址 `baiyao-rebuilt.zip` 与 `baiyao-hehuan.zip` 同步生成且哈希一致；旧打包命令也转到同一校验入口。自动 Chromium 验证不等于真实手机或人工试玩；自动回归策略仍读取规则层内部意图，不能据此宣称隐藏预告后的难度已经平衡。

`--backup` 的同一实例副本不保证跨实例存在。本版未据此宣称已发布云环境、修改配置或完成全新云实例恢复。旧版文档见 `dev/v10-*.md`，历史云配置记录只对其注明版本有效。

首批阵营内容新增 `dev/enemy-factions.js`；恢复载荷包含六组战斗画像、六件物品和两处洞府背景。PNG原图单独存放 `recovery/factions-art-originals.zip`，不参与运行，不应误删。

P2新增32张PNG母图保存在 `recovery/frontier-art-originals.zip`，与P1母图分包。游戏ZIP只含目录版完整运行资源和源码；单文件HTML单独下载，以免重复嵌入图片扩大ZIP。

P3、P4选用PNG分别位于 `recovery/later-p3-art-originals.zip`（24张）和 `recovery/special-p4-art-originals.zip`（35张）。它们与此前两份母图包均独立于运行包，实际逐张哈希及CRC校验在打包门禁内。
