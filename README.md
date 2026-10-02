# 轻账（qingzhang）

只存在手机本地的记账 PWA。导入微信／支付宝账单，看清消费比例。

**没有服务器，没有账号，没有网络请求。** 数据全部存在浏览器的 IndexedDB 里。

## 线上地址

**https://zach610176.github.io/qingzhang/**

托管在 GitHub Pages（HTTPS），Service Worker 与加密备份在线上均可用。
代码托管是公开的，但**用户数据永远不上传** —— 应用运行时不发任何网络请求。

---

## 快速开始

```bash
# 1. 在电脑上起本地服务器
node tools/serve.mjs              # 默认 8412 端口

# 2. 显示手机可扫的二维码
node tools/qr.mjs

# 3. 跑全量验证（模块自检 + 单元测试 + 冒烟 + 数字审计 + 离线 + 截图）
node tools/verify-all.mjs

# 4. 部署 / 更新到 GitHub Pages
$env:GITHUB_TOKEN = "ghp_..."     # 需要 public_repo 权限的 classic token
node tools/deploy-pages.mjs
```

面向用户的说明在 [`使用说明.md`](使用说明.md)。想装到 iPhone 上，
直接双击根目录的 `安装到手机.bat`。

### 验证脚本也支持线上环境

```bash
node tools/verify-offline.mjs https://zach610176.github.io/qingzhang/
node tools/shoot.mjs https://zach610176.github.io/qingzhang/ --demo
```

`--demo` 会先在页内载入演示数据再截图，这样才能对线上环境做数字校验
（不带的线上环境是空库，首页是「欢迎」空状态）。

---

## 目录结构

```
index.html              应用外壳（唯一的 HTML）
styles.css              全部样式（苹果原生风格，自动浅色/深色）
sw.js                   Service Worker：离线缓存
manifest.webmanifest    PWA 清单

src/core/               纯逻辑，浏览器和 Node 共用，可单元测试
  model.js              数据模型：分类、交易类型、金额单位（分）、工具函数
  util.js               通用纯函数：日期/金额解析、哈希、文本清洗
  db.js                 IndexedDB 读写
  csv.js                CSV 分词器、表头探测、编码探测（UTF-8 / GBK）
  zip.js                ZIP 解压（含自写的 DEFLATE 与 ZipCrypto）
  parser.js             微信／支付宝账单解析
  classify.js           自动分类引擎 + 交易类型判定
  dedupe.js             去重 + 内部转账配对
  stats.js              全部统计口径
  budget.js             预算与提醒
  recurring.js          周期账单生成
  crypto.js             备份加密（PBKDF2 + AES-256-GCM）
  import.js             导入流水线（解析 → 去重 → 写库）
  rules.js              分类规则（商户记忆）
  anonymize.js          脱敏逻辑（供脱敏工具复用）

src/ui/                 界面层
  app.js                主控制器：启动、导航、事件分发、重绘
  store.js              状态管理
  dom.js                弹层、Toast、格式化
  sheets.js             记账面板（数字键盘）
  qr.js                 二维码生成（纯 JS，含里德-所罗门纠错）
  charts.js             SVG 图表库
  demo.js               演示数据生成
  screen-*.js           五个页面：首页／明细／统计／预算／我的
  import-screen.js      导入流程界面

tests/                  单元测试（node:test，零依赖）
tools/                  开发工具（见下）
```

---

## 关键设计决定

### 金额一律用「分」存整数

浮点数会出错：`0.1 + 0.2 === 0.30000000000000004`。
所以内部全部用整数分，只在**显示的最后一步**除以 100。

### 统计口径（最容易算错的地方）

| 项目 | 计算方式 |
|---|---|
| 总支出 | 所有 `type === 'expense'` 之和 |
| 消费净额 | 总支出 − 退款 ← 界面上「本月消费」用这个 |
| 真实收入 | 收入 + 红包（**退款不算收入**，它是冲减支出） |
| 结余 | 真实收入 − 消费净额 |
| 内部转账 | **完全不参与**任何统计 |
| 信用卡还款 | **完全不参与**任何统计（刷卡时已经算过一次消费了） |

被 `excluded`（手动标记不计入）或 `duplicateOf`（判重）的交易，在所有统计里都被忽略。

### 去重策略

两层：

1. **批内**：指纹完全相同**且时间落在同一分钟内**才判重。
   （同一天同一商户同一金额可能是两笔真实交易——买两杯奶茶。）
2. **跨批**：指纹相同且能一一对应时判为重复导入；
   如果库里只有 1 笔而新导入有 2 笔，多出来的那笔保留。

关键在于去重**不删数据**，只打 `duplicateOf` 标记。判错了可以人工改回来。

### 为什么自己写 ZIP 解压

微信发到邮箱的账单是**加密 ZIP**（ZipCrypto），手机上没法调系统解压。
所以自己实现了 DEFLATE（RFC 1951）+ ZipCrypto（PKZIP 流密码）。
AES 加密的 ZIP 会**明确报错**而不是给错数据。

`zip.js` 的正确性有独立参照验证：inflate 与 Node 的 `zlib` 对拍
1.3 亿字节全部一致；ZipCrypto 与 CPython 的 `zipfile` 对拍通过。

### 为什么自己写二维码

要在终端里打印二维码给手机扫，不想引入 npm 依赖。
实现的是标准 QR Model 2 + Byte 模式 + 里德-所罗门纠错（级别 M）。
正确性由**独立的解码器**验证：每种输入都反向解回原文，
并重新跑一遍纠错编码比对码字。

### iOS 的两个硬限制

1. **7 天未打开可能被清理本地数据** → 所以加密备份是必需功能，不是加分项。
   启动时会申请 `navigator.storage.persist()` 降低概率。
2. **Service Worker 只在安全上下文生效**（https 或 localhost）。
   用 `http://192.168.x.x` 打开时 SW 不会注册，离线能力失效。
   应用会在「我的」页面明确显示「离线可用：未开启」并说明原因。

---

## 工具

| 命令 | 作用 |
|---|---|
| `node tools/verify-all.mjs` | **一键全量验证**，最后给汇总表 |
| `node tools/check-modules.mjs` | 逐个 import 每个模块，抓语法/导入错误 |
| `node tools/check-shell.mjs` | 校验 index.html 与 shell.html 两份外壳没有走样 |
| `node tools/smoke.mjs` | 假 DOM + 内存数据库，把所有页面和筛选组合渲染一遍 |
| `node tools/audit-numbers.mjs` | 独立重算所有数字，与界面渲染结果对账 |
| `node tools/verify-offline.mjs` | 真 Chrome 无头：SW 注册、缓存完整性、断网重载、离线记账 |
| `node tools/shoot.mjs` | 真 Chrome 无头 + CDP：按 iPhone 尺寸截图，抓页面异常 |
| `node tools/serve.mjs` | 局域网静态服务器（手机访问用） |
| `node tools/qr.mjs` | 终端打印二维码，手机扫一扫就能打开 |
| `node tools/make-icons.mjs` | 生成全部尺寸图标（纯 JS 写 PNG，无依赖） |
| `node tools/snapshot.mjs` | **快照工具**（这台机器没有 git，用它兜底） |
| `node tools/deploy-pages.mjs` | 部署／更新到 GitHub Pages（走 REST API，不需要 git） |
| `node tools/setup-phone-access.ps1` | 加一条窄范围防火墙规则（**需要管理员**，带备份与撤销） |
| `node tools/diag-sw.mjs` | Service Worker 注册失败时用来抓真实报错 |
| `node tools/diag-parser.mjs` | 把账单解析结果逐笔打出来，排查解析问题 |
| `node tools/diag-refund.mjs` | 排查 GBK 编码与「已退款」处理 |

因为没有 git，改动前建议先存一份快照：

```bash
node tools/snapshot.mjs save "改解析逻辑之前"
node tools/snapshot.mjs diff backup-qingzhang-20261002-210626   # 看改了什么
node tools/snapshot.mjs restore backup-qingzhang-20261002-210626 # 还原
```

`tools/db-memory.js` + `tools/db-mock-hook.mjs` 是一对：
用 Node 的模块加载钩子把 IndexedDB 换成内存实现，
这样界面代码可以在 Node 里跑测试。

### 测试里为什么有 `--test-isolation=none`

Node 的测试运行器默认会给每个测试文件开子进程并用管道收输出。
DSH 的 Windows 沙箱禁止开管道，会报 `spawn EPERM`。
`--test-isolation=none` 让所有测试在同进程里跑，结果完全一样。

---

## 测试现状

`node tools/verify-all.mjs` 全绿：

```
模块自检      28/28
外壳一致性     index.html 与 shell.html 同步
单元测试       177 / 177（7 个测试文件）
界面冒烟       47/47 场景
数字一致性审计  966 项
离线能力       通过（断网可打开、可记账、缓存 34 个文件完整）
截图          14 张，零页面异常
```

测试覆盖的重点：
- **账单解析**：微信/支付宝的真实表头结构、前言区、GBK 编码、BOM、
  带逗号和换行的引号字段、千分位金额、各种「已退款/交易关闭」跳过规则
- **ZIP**：普通 zip、加密 zip（ZipCrypto）、中文条目名、CRC 校验
- **二维码**：用一个独立实现的解码器把生成的码反解回原文，
  并重新跑一遍里德-所罗门编码校验纠错码字
- **金额精度**：全程整数分，有专门的浮点误差回归测试
- **统计口径**：净额/总额/余额自洽，转账与还款不进消费，判重不进统计

### 测试写错过的地方（值得记下来）

测试不是圣经，这次修 bug 的过程中发现有 8 处失败其实是**测试自己写错了**：

- `parseDirection('/')` 期望 `'none'`，但整体业务要求 `/` 的行算消费
- `at(res, '2026-01-03 08:30', ...)` 少写了秒，而 fixture 是 `08:30:12`
- 「同一分钟指纹相同」用的基准是 `08:12:33`，却 `+30` 秒跨到了下一分钟
- 断言「账单里没有优衣库」，但 1 月 5 日那笔正常购买的商户也叫优衣库
- 断言「千分位那笔的商户是瑞幸」，实际是「某某商店, 分店」
- 多处硬编码的笔数 45 和金额，是修复前的手算值

所以这套测试的价值不在于「全绿」，而在于**每条失败都追到了根因**：
分清哪边错，然后修错的那一边。

---

## 已知限制

- **不能自动获取交易**。iPhone 上网页应用读不到微信/支付宝通知，
  也不能常驻后台，官方也不开放个人交易接口。只能靠导入账单 + 手动记账。
- **不读取通知、不越狱、不装插件**。
- 局域网 http 地址下 Service Worker 不生效（见上文 iOS 限制）。
- AES 加密的 ZIP 暂不支持（会明确报错，不会给错数据）。
- 多分卷 ZIP、bzip2/LZMA 压缩的 ZIP 不支持。
- `.xlsx` Excel 账单暂不支持（CSV 和 ZIP 已支持）。
- 全量数据一次性载入内存。几千笔毫无压力；十万笔以上需要改成分页。

---

## 部署用的令牌（安全提醒）

`deploy-pages.mjs` 需要一个 GitHub classic token，权限**只要 `public_repo`**。

⚠️ **令牌等同于账号的临时钥匙。** 用完之后：

1. 打开 https://github.com/settings/tokens
2. 找到部署时创建的那个令牌，点 **Delete**（或 Revoke）
3. 下次要更新代码时，再临时建一个新的

令牌不要写进任何文件、不要提交到仓库、不要贴在聊天记录里长期留存。
本项目的脚本只从环境变量 `GITHUB_TOKEN` 读取，不会落盘。

关于仓库的公开性：GitHub Pages 免费版只能部署**公开仓库**。
仓库里只有程序代码（`index.html`、`src/`、`sw.js` 等），
**没有任何用户数据** —— 账单在用户手机的 IndexedDB 里，从不上传。

---

## 隐私

- 应用运行时**没有任何网络请求**。Service Worker 对跨域请求直接返回失败。
- 账单文件在**浏览器里本地解析**，不上传到任何地方。
- 备份文件用 PBKDF2-SHA256（31 万次迭代）+ AES-256-GCM 加密，
  密码丢失无法恢复（没有后门，这是设计如此）。
- 脱敏工具（`tools/anonymize/`）同样完全本地运行，不联网。
