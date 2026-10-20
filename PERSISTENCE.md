# 成品与离线恢复

第四版提供两种完整试玩成品：

- `index.html` 是目录版，引用同目录 `assets/portraits/`、`assets/cards/`、`assets/events/`、`assets/relics/`、`assets/puppet/` 中的 70 张 WebP。下载后应保留整个目录。
- `baiyao-standalone.html` 是图片、脚本、样式全部内嵌的单文件版，可以单独复制并离线打开。

试玩只需要浏览器，不需要安装 Node.js、Python、依赖包或运行服务器。原始八张 PNG 留在 `assets/` 根目录供编辑备份；试玩和第四版恢复均不依赖这些大图。

## 制作和恢复

开发构建以 `node dev/build.cjs` 为准，`python3 dev/build.py` 只是兼容转发入口。以下操作需要本机已安装 Node.js；恢复打包工具还需要 Python 3，运行生成的恢复脚本需要 POSIX shell。以上都属于开发或恢复工具，不是试玩启动步骤。

```sh
node dev/build.cjs --strict
node dev/build.cjs --strict --inline --output baiyao-standalone.html
python3 dev/persist.py --test --backup
python3 dev/persist.py --source-only --test --backup
```

完整恢复包 `recovery/restore.sh` 保存九份开发源文件：`shell.html`、`art.js`、`audio.js`、`engine.js`、`ui.js`、`build.cjs`、兼容入口 `build.py`、动态人物模块 `puppet.js` 和绑定数据 `puppet-rig.json`，以及 70 张正式 WebP（8 张人物、36 张卡牌、9 张事件、13 张遗物、3 张猫妖状态透明图、1 张闭眼纹理）。包内不重复保存生成 HTML，不包含旧 PNG 和废弃的 `images.js`。恢复时先在临时目录执行严格构建，分别生成目录版 `index.html` 和单文件版 `baiyao-standalone.html`，两份成品的 SHA256 必须与制作包时已验收的成品完全一致。

第四版新增的自制动态人物模块及 rig JSON 都是本游戏源码，恢复包不将其称为正式 Cubism `.moc3` 模型。构建将绑定数据直接写进 HTML，恢复和试玩均不需要在线获取绑定文件。

运行 `sh recovery/restore.sh` 默认补齐 `/workspace/CC`。推荐用空目录演练，例如：

```sh
BAIYAO_RESTORE_ROOT=/tmp/baiyao-restored sh recovery/restore.sh
```

源码恢复包 `recovery/restore-source.sh` 只保存上述九份完整源码及绑定数据，不含任何图片。它在完全没有 `assets/` 的临时目录中运行 `node dev/build.cjs --strict --slim`，生成可独立游玩的 SVG 版 `index.html`，不读取 `images.js`。目标目录已有的部分 WebP 保持原样，不参与 SVG 构建。动态猫妖图片在源码恢复包中不存在，浏览器运行时应使用已有 SVG 后备显示；具体交互检查以本版浏览器验收报告为准。

源码包可以补齐已知同版成品的源码：已有全内嵌 HTML 即使被改名为 `index.html` 也可保留，已有 `baiyao-standalone.html` 保持原样；已有目录版 `index.html` 时，必须有全部 70 张正确 WebP 才会保留并继续恢复。目录版缺图时不会悄悄替换 HTML，而是停止并提示使用完整包或另选空目录。这样可以避免把不完整的目录版误报为完整恢复。

两个恢复包都只补齐缺失文件，已有相同文件不会重写。任何将要恢复的源码、资源或 HTML 存在不同内容，都会在写入项目文件前拒绝操作并保留修改；源码包也校验所有已存在的已知 WebP。符号链接、父目录被同名文件占用、相对路径、根目录或含 `..` 的恢复路径会被拒绝。它们用于恢复同一版本，不能拿来覆盖升级旧目录。

恢复不访问网络，也不含凭据。它依靠 Python 3 与 Node.js 标准库重新构建成品；若未安装这些工具，可直接从 GitHub 下载已经构建好的试玩版。

## 校验与实际演练记录

`recovery/manifest.json` 和 `source-manifest.json` 记录本版源文件、WebP、输出 HTML 与包本身的 SHA256。`restore.sha256` 和 `restore-source.sha256` 记录脚本校验值。校验用于发现损坏，不能替代外部可信签名。

`python3 dev/persist.py --test` 与 `--source-only --test` 会在当前实例的独立临时目录实际运行恢复脚本，测试空目录恢复、重复零写入、缺文件重建、修改拒绝、符号链接与路径检查，并单独检查已修改的战损透明图和绑定 JSON 不会被覆盖。源码版还测试部分图片的 SVG 回退、现有单文件版保留、完整目录版保留与不完整目录版拒绝。每次制作新包都会删除对应旧测试报告，避免把上一版本的通过记录用于新包；本版实际执行结果见格式为 `baiyao-recovery-tests-v4` 的 `tests.json` 和 `source-tests.json`。

第四版两包已在最终构建后重新生成并实际演练：完整恢复 **15/15 通过**，源码/SVG 恢复 **19/19 通过**，合计 34 项。完整脚本为 6,092,630 字节，源码脚本为 121,941 字节。完整恢复包含 9 份源码及绑定数据与 70 张 WebP，全部 79 个输入文件已逐项核验；缺失绑定 JSON、濒危状态图片和闭眼纹理的恢复也已实际执行。这些结果来自本机独立临时目录，不是新云实例或云配置发布测试。

恢复后目录版 `index.html` 的 SHA256 为 `93c0aedcd9162ed35f3c4d54c32e7dbce8f17be77482bc27c69212dd1684c7ee`，全内嵌 `baiyao-standalone.html` 为 `d1a61a858ca3036c3eafbe66373ea136ede07007c00a444c53bd664faec3fd5c`；没有任何图片文件时，源码包生成的 SVG 版为 `f37307df5572bf436d89b0ffa60e4b0018ac16bcd0388cdb93874ab1922bc022`。通过次数、成品校验值及脚本大小均对应 v4 清单和报告，没有沿用第三版结果。

`--backup` 另复制恢复脚本、清单和报告到 `/workspace/scratch/baiyao-recovery`，并逐字节核对。这是同一个云实例里的第二份副本，不保证跨实例存在。恢复工具没有写入、发布或验证新的云环境配置，也不把本机演练称为新云实例恢复。

## GitHub 与云配置

用户已授权把项目同步至 GitHub `YONGLINGZ/CC`；完整成品是否已远程备份，应以远程 `main` 的实际文件和提交核验为准。生成本地文件、制作 ZIP、运行恢复测试均不等于推送成功。工作区路径链接也不是已经导出的下载附件。

`recovery/config-status.json` 是第一版（2026-10-17）的原始历史记录，本次没有修改。其中 `github_pushed: false` 表示当时尚未进行之后获授权的推送，并不代表现在的远程状态。

第一版完整三 PNG 恢复脚本保存至云草稿时曾被后端拒绝，错误是 `ASB rejected the configuration. Check the requirements and allowed_domains before retrying.`，后端没有提供能确定具体原因的信息。后来第一版源码/SVG 的 `install_script` 和 `start_skill` 成功保存并读回核对。那份历史配置不是第四版备份。

2026-10-20 按 `cloud-environment-onboarding:setup` 技能重新读取实际草稿，发现仍是第一版恢复载荷和旧“不推送”说明。本轮已清空过期的 `install_script`（当前游戏无需依赖安装），并保存复用现有 `/workspace/CC` 检出目录的 `start_skill`，包含两种离线成品、Node/Python 构建与实际回归命令、保留修改、不另建 worktree、动态原型限制及下载方式。保存返回 `status: saved`、`requires_publish: true`，随后读回确认两字段完全一致，网络、密钥及运行要求均保持原样。状态见 `recovery/cloud-v4-status.json`。**没有发布环境，也没有在全新云实例验证**；配置未内嵌新图，完整备份来自仓库和本版恢复包。

第二版曾实际通过完整恢复 7 项、源码恢复 12 项检查；第三版曾实际通过完整恢复 13 项、源码恢复 17 项检查。这些是对应旧构建的历史结果，不是第四版验收。第四版的恢复脚本、字节数和校验值以当前清单与新报告为准，不沿用旧报告。此处没有发布环境，也没有在全新云实例验证恢复。下载和游玩 GitHub 中的成品不需要发布云环境。
