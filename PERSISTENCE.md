# 离线备份与恢复 · 寒渊因缘版

游玩下载后的 `index.html`＋`assets/`，或完整单文件 `baiyao-standalone.html`。下载与运行游戏不需要发布云环境。工作区路径不是已导出的聊天附件，完整远程备份以 GitHub `YONGLINGZ/CC` 的实际文件为准。

## 本版恢复包

- `recovery/restore.sh`：内含 10 份可编辑源码及绑定数据、118 张 WebP；恢复后重建目录版和完整单文件。
- `recovery/restore-source.sh`：仅内含相同 10 份源码及绑定数据，没有图片；恢复为 SVG／程序三维版本，仍可玩。

在目标空目录执行 `BAIYAO_RESTORE_ROOT=/绝对路径 sh restore.sh`（或 `restore-source.sh`）。恢复需要 POSIX shell、Python 3 和 Node.js；游玩成品只需要浏览器。工具只补缺失文件，已有修改或符号链接会在写入前拒绝；同版本重复执行不改写已有文件。

本版已实际执行完整恢复 17/17、无图源码恢复 21/21，共 38 项，0 失败。完整压缩载荷 6,913,753 字节，无图源码载荷 135,539 字节；脚本本身还包含清单和 base64 编码。精确输入和输出 SHA256 见 `manifest.json`、`source-manifest.json`，检查记录见 `tests.json`、`source-tests.json`。二者格式均标记 v6。

`--backup` 已将脚本、清单和报告复制至 `/workspace/scratch/baiyao-recovery` 并校验；这是同一实例的副本，不能保证跨实例存在。当前成品也通过实际浏览器导出、独立重开检查，详见 `TESTING.md`。

## 云配置历史

本版没有修改或发布云环境配置，没有做全新云实例恢复。`recovery/cloud-v4-status.json` 是第四版曾保存并读回云配置草稿的历史证据；`requires_publish: true` 不表示已经发布。第一版 `config-status.json` 的旧“不推送”状态也不是目前 GitHub 状态。

旧版说明保存在 `dev/v5-PERSISTENCE.md` 等归档；旧检查数与校验值只对应旧构建。本版恢复内容由当前源码和资源重新生成，未将历史通过记录套用到新包。
