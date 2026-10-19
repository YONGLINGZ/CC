# 成品与恢复

试玩入口为 `index.html`：它把规则、界面、内联 SVG 占位图与正式 PNG 立绘全部封装在一个 HTML 文件中，在浏览器中离线运行。第二版使用八张 PNG：猫妖、狐妖、重制蛇妖，以及纸人、灯鬼、山魈、白骨侍、夜叉。`assets/` 保留原始立绘，`dev/` 保留可修改源码。运行 `python3 dev/build.py` 可重新生成 HTML。

`python3 dev/persist.py --test --backup` 会制作 `recovery/restore.sh`，内含五份必需源文件与全部八张原始 PNG；任一必需图片缺失时拒绝制作不完整的备份。恢复包不重复保存生成的 HTML，而在临时目录中离线重建它，并严格核验其 SHA256 与制作恢复包时的成品完全一致。脚本只需要 Python 3 标准库和 POSIX shell，不访问网络，也不含令牌或凭据。

运行 `sh recovery/restore.sh` 可将成品补齐到 `/workspace/CC`；测试或另选绝对目录时，运行 `BAIYAO_RESTORE_ROOT=/tmp/baiyao-restored sh recovery/restore.sh`。它只写入缺失文件，已有相同文件保持不变；发现现有源文件、PNG 或 HTML 内容不同，会在写入项目文件前拒绝恢复并保留修改。符号链接也会被拒绝。

`recovery/manifest.json` 记录源文件、PNG 与生成 HTML 的 SHA256；`restore.sha256` 记录恢复脚本校验值；`tests.json` 记录当前实例实际执行的恢复演练结果。校验值用于发现意外损坏，不能替代外部可信签名。

`python3 dev/persist.py --source-only --test --backup` 另外制作体积较小的 `recovery/restore-source.sh`。它内含五份完整源码而没有 PNG 数据：目标目录八张 PNG 齐全且逐张校验一致时重建全图版；图片不齐时重建统一的内联 SVG 版，现有图片文件保持原样。已有当前验收版全图 HTML 时会逐字节保留它，不因外部图片缺失而降级。现有源码、图片或 HTML 有用户修改时仍会拒绝恢复，不覆盖修改。该模式只需验证全图与 SVG 两种成品，不生成 256 种图片组合。

源码包对应 `source-manifest.json`、`restore-source.sha256` 与 `source-tests.json`。两个恢复包都只负责补齐**同一版本**缺失文件；遇到旧版文件与新版包冲突时，请选择空目录恢复并自行比较，不会直接升级或覆盖旧目录。生成这些文件、运行本机演练或推送 GitHub，都不会更新云环境配置草稿。

脚本和校验清单另存于 `/workspace/scratch/baiyao-recovery`，它是**同一云实例内的第二份副本**，不保证跨实例保留。另外保留的本地 Git 提交和 Git bundle 本身也不是远端备份。用户随后已授权把完整项目同步至 GitHub `YONGLINGZ/CC`；以远程 `main` 实际包含的文件与提交为准。`config-status.json` 中的 `github_pushed: false` 是制作配置草稿时的历史记录，不代表后续同步状态。

配置草稿保存与环境发布是两个步骤。仅把恢复脚本写在磁盘上，不能证明平台已经持久保存；仅成功保存配置草稿，也不能证明已发布或已在全新实例恢复。需要以工具返回的保存结果为准，并由用户在环境设置中审阅保存后发布。实际保存了哪些字段、是否完成发布或新实例验证，应以本次交付报告为准，不能从本文件推断。

当前聊天的工作区路径链接不是已导出的下载附件。保留本地文件或生成恢复包，不等于已经将成品下载到用户电脑。

## 第二版恢复演练（2026-10-19）

两个包均已在当前实例的独立临时目录实际执行。完整包通过 7 项检查：完整重建并逐文件核验、重复运行零写入、补齐缺失文件、拒绝覆盖修改、拒绝符号链接，以及清除冲突后的再次恢复。源码包通过 12 项检查，另覆盖八图齐全、部分图片、完整 HTML 保留、修改小兵图片和 SVG 回退。结果分别记录在 `recovery/tests.json` 与 `recovery/source-tests.json`。

本次完整恢复脚本为 30,465,622 字节，包含五份源码和八张 PNG；源码恢复脚本为 66,788 字节，不含 PNG。两种恢复路径构建出的全图 HTML SHA256 均为 `e082c97165996824e47ed21fbfb04f330dc562fccc818a50059347b2f56ef3cd`；无原图时 SVG 成品 SHA256 为 `6e30ec6d1f8ac376255053d698acfaa2f235c878b0f8b47e6286d27dabb8d10c`。恢复脚本、校验清单、测试结果与同实例备用目录已逐字节核对。

这 19 项是本机真实恢复检查，不是新云实例验证。本次没有修改或保存云配置草稿，也没有发布环境；历史配置状态保持原样。第二版远程交付仍以 GitHub 实际推送及远端核验结果为准。

## 旧版云配置保存历史（2026-10-17）

以下记录属于第一版。第二版没有修改或重新保存云配置，`recovery/config-status.json` 也保留原始历史记录。当前 `restore.sh` 与 `restore-source.sh` 已随第二版代码重新制作，不能用下述旧字节数或旧校验值核验它们；请使用同目录最新 manifest 与 sha256 文件。旧配置草稿中的源码也仍是第一版，不能视为第二版的备份。

完整三 PNG 恢复脚本为 11,501,436 字节，SHA256 为 `a18c615490396fa5785186d9b1e94b6d5e6d53f83a819ccdc0e913d1b30331f2`。其 7 项真实恢复演练通过，同实例两份脚本已逐字节核对。但把完整脚本写入配置草稿时，后端返回 `INVALID_ARGUMENT`，原文为 `ASB rejected the configuration. Check the requirements and allowed_domains before retrying.`；读回确认该次没有保存。后端没有指明具体字段或长度限制，因此不能确定拒绝原因。该请求没有改动网络、凭据或仓库设置。

随后独立保存简短 `start_skill` 成功，证明接口可以保存较小字段。经明确授权后，另制作了 `recovery/restore-source.sh`：它保存**完整游戏规则与界面，立绘使用内联 SVG；PNG 原件未保存到配置草稿**。该包仅嵌入五份完整源码，未删减游戏功能。源代码恢复脚本为 44,557 字节，SHA256 为 `3ebd1ec15645ee7ae3e57b83a8aebe1f444c31463c10189e087f8823edb74ce5`。使用 `python3 dev/persist.py --source-only --test --backup` 可制作和演练该独立包，不改动完整恢复脚本。

源代码/SVG 恢复的 8 项真实演练通过，包括无 PNG 时重建、重复运行零写入、缺失 HTML 重建、保留已有全图 HTML（有／无外部 PNG 两种情况）、已有三 PNG 时重建相同全图成品、拒绝覆盖修改过的源码或 HTML。对任意已存在的立绘修改也会停止，不写入 PNG 文件。其 SVG 成品 SHA256 为 `fe70179bb52ac3589f8c611d5b600a674d6cf50297845b02caa3adfbf6a2f85e`；原全图成品 SHA256 为 `70888559163868c59ce336047160850e0eecc810a2f4cf6f4eccf7da7dde2b04`。

父代理另在独立 `/tmp` 目录实际执行 SVG 恢复包，并用浏览器载入恢复后的完整页面：进入开始页、开始游戏、进入首战，以及真实点牌和选敌均有效；JavaScript 异常与网络请求均为 0。这是当前实例内的额外试玩检查，不是完整浏览器验收套件重跑，也不是全新云实例恢复。

**当时配置草稿实际保存了第一版源代码/SVG 版 `install_script` 与对应 `start_skill`**，工具返回 `status: saved`、`requires_publish: true`。两字段均已读回逐字符核对一致，草稿 revision 为 3。当时完整三 PNG 包未写入配置；之后用户授权的 GitHub 同步是独立的远程备份。详细保存结果与读回证据在 `recovery/config-status.json`。

此处没有执行环境发布，也没有在新云实例验证恢复。环境设置中的旧草稿需要用户审阅后再决定是否发布，不能据此保证第二版代码的保留。当前交付的全图 HTML 仍完整保留，没有被 SVG 后备版替换；游玩或从 GitHub 下载不需要发布云环境。
