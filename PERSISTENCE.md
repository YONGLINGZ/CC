# 成品与恢复

试玩入口为 `index.html`：它把规则、界面、内联 SVG 占位图与正式 PNG 立绘全部封装在一个 HTML 文件中，在浏览器中离线运行。`assets/` 保留原始立绘，`dev/` 保留可修改源码。运行 `python3 dev/build.py` 可重新生成 HTML。

`python3 dev/persist.py --test --backup` 会制作 `recovery/restore.sh`，内含全部必需源文件与原始 PNG。恢复包不重复保存生成的 HTML，而在临时目录中离线重建它，并严格核验其 SHA256 与制作恢复包时的成品完全一致。脚本只需要 Python 3 标准库和 POSIX shell，不访问网络，也不含令牌或凭据。

运行 `sh recovery/restore.sh` 可将成品补齐到 `/workspace/CC`；测试或另选绝对目录时，运行 `BAIYAO_RESTORE_ROOT=/tmp/baiyao-restored sh recovery/restore.sh`。它只写入缺失文件，已有相同文件保持不变；发现现有源文件、PNG 或 HTML 内容不同，会在写入项目文件前拒绝恢复并保留修改。符号链接也会被拒绝。

`recovery/manifest.json` 记录源文件、PNG 与生成 HTML 的 SHA256；`restore.sha256` 记录恢复脚本校验值；`tests.json` 记录当前实例实际执行的恢复演练结果。校验值用于发现意外损坏，不能替代外部可信签名。

脚本和校验清单另存于 `/workspace/scratch/baiyao-recovery`，它是**同一云实例内的第二份副本**，不保证跨实例保留。另外保留的本地 Git 提交和 Git bundle 也不是远端备份；本次未向 GitHub 推送。

配置草稿保存与环境发布是两个步骤。仅把恢复脚本写在磁盘上，不能证明平台已经持久保存；仅成功保存配置草稿，也不能证明已发布或已在全新实例恢复。需要以工具返回的保存结果为准，并由用户在环境设置中审阅保存后发布。实际保存了哪些字段、是否完成发布或新实例验证，应以本次交付报告为准，不能从本文件推断。

当前聊天的工作区路径链接不是已导出的下载附件。保留本地文件或生成恢复包，不等于已经将成品下载到用户电脑。
