# LMStudio-MCP-Locally

MCP 服务器（npm 包名：`lmstudio-mcp-local`），让 **LM Studio** 通过 MCP 协议 **直接读取你电脑上的本地文件路径**（PDF、DOCX、Markdown、代码、JSON、CSV 等）。  
全部在本机运行，文件不上传云端。

GitHub：[tomaxtoLuca/LMStudio-MCP-LocalPath](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath) · English: [README.md](../README.md)

## 项目概览（Overview）

**lmstudio-mcp-local**（本地目录名：`LMStudio-MCP-Locally`）是由维护者**独立自研**的只读 MCP 服务器，通过 [Model Context Protocol](https://modelcontextprotocol.io/) 将 [LM Studio](https://lmstudio.ai/) 与本机文件连接起来。

|              |                                                                        |
| ------------ | ---------------------------------------------------------------------- |
| **维护者**   | [tomaxtoLuca](https://github.com/tomaxtoLuca)                          |
| **许可证**   | [MIT](../LICENSE)                                                      |
| **运行环境** | Node.js ≥ 22                                                           |
| **传输方式** | **stdio** — LM Studio 通过 `mcp.json` 的 `command` + `args` 启动子进程 |
| **工具数量** | 7（读取、列目录、搜索、查找、批量读、元数据、本地推理）                |

**特点**

- **面向 LM Studio 的 stdio 接入** — 在 `~/.lmstudio/mcp.json` 中配置 `command` + `args`（与 `browser` 相同）；无需手动 `npm start`，无需 8080 端口。
- **路径白名单** — 仅可读取你配置的目录；含扩展名与大小限制。
- **`reason_over_file`** — 读取本地文件后调用**本机** LM Studio API，数据不出本机。
- **文档格式** — 支持 PDF、DOCX 及纯文本/代码（`pdf-parse`、`mammoth`）。

**不包含：** 云端上传、向量库、文件写入/删除、LM Studio 官方支持。

## License

[MIT](../LICENSE)

## 非官方声明与免责声明

> **非法律意见。** 以下说明项目来源与责任边界。使用本软件风险自负。

### 与 LM Studio 无隶属关系

本项目 **并非** 由 **LM Studio**、**LM Studio AB** 或其关联方开发、背书、赞助或维护。  
文中 “LM Studio” 仅用于说明 **兼容性**（本 MCP 服务器供 LM Studio 桌面客户端连接使用）。  
**不** 声称拥有任何商标，**不** 暗示官方合作或授权。

### 原创说明

**lmstudio-mcp-local** 为维护者 **独立设计并实现的原作品**，**不是** LM Studio 的分支、拷贝或官方分发版本。  
所使用的第三方 **库**（MCP SDK、`pdf-parse`、`mammoth` 等）均按其开源许可证引用；这些库的源码 **未** 复制进本仓库 `src/`。

### 作者声明

维护者（[tomaxtoLuca](https://github.com/tomaxtoLuca)）声明，据其所知：

- 本项目 **非职务作品**，维护者有权以开源形式发布；
- **未** 包含未经授权的他人代码；
- **不存在** 雇主或合同条款禁止以 MIT 协议开源本项目。

若你认为本仓库内容侵犯你的权利，请 [提交 Issue](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath/issues)。

### 使用者责任

- 谨慎配置 **`allowedPaths`**，仅开放你有权访问的目录；
- 默认绑定 **`127.0.0.1`**；若改为对外网/局域网暴露，请自行评估风险；
- 读取个人或机密文件时，须自行遵守适用法律、单位制度与隐私要求；
- 软件按 **「现状」** 提供，详见 [MIT 许可证](../LICENSE) 中的免责与责任限制条款。

---

## 这是什么

本项目是一个 **MCP Server**，运行在 `127.0.0.1`，把本地磁盘文件能力暴露给 LM Studio Chat 里的模型。

**读取方式：** 通过 Node.js 直接访问你电脑上的真实文件（不是向量库、不是云存储、不是预上传副本）。

```
本地磁盘文件
    ↓  fs 直接读取（路径白名单内）
LMStudio-MCP-Locally（MCP Server）
    ↓  MCP 协议
LM Studio Chat 模型
```

---

## 必装 / 必开组件

| 类型     | 组件                              | 要求                                                      |
| -------- | --------------------------------- | --------------------------------------------------------- |
| **必装** | [Node.js](https://nodejs.org/)    | **≥ 22.0.0**                                              |
| **必装** | npm                               | 随 Node 自带                                              |
| **必装** | [LM Studio](https://lmstudio.ai/) | 桌面客户端                                                |
| **必开** | LM Studio 本地 API                | 默认 `http://127.0.0.1:1234`                              |
| **必开** | 已加载模型                        | 在 LM Studio 中 Load 一个模型                             |
| **必开** | 本 MCP Server                     | LM Studio 通过 `mcp.json` 自动 spawn（stdio）             |
| **必配** | 本地路径白名单                    | `lmstudio-mcp.json` 或 `MCP_CONFIG` 中的 `allowedPaths`   |
| **必配** | LM Studio MCP 列表                | `~/.lmstudio/mcp.json` 中的 `command` + `args`（第 3 步） |

**不需要：** Python、Docker、向量数据库、额外数据库。

### 模型要求

| 用法               | 要求                                |
| ------------------ | ----------------------------------- |
| Chat 自动读文件    | 模型需支持 **Tool use**（函数调用） |
| `reason_over_file` | 使用 LM Studio 当前已加载的模型     |
| 长文档             | 受模型 **上下文窗口** 限制          |

---

## 系统要求

| 项目          | 要求                                        |
| ------------- | ------------------------------------------- |
| 操作系统      | Windows 10+ / macOS / Linux                 |
| Node.js       | ≥ 22                                        |
| 网络          | 安装依赖时需要；**读本地文件不需要外网**    |
| LM Studio API | 默认 **1234**（仅 `reason_over_file` 需要） |

---

## 快速开始

### 方式 A：npm 安装（推荐）

```bash
npm install -g lmstudio-mcp-local
```

LM Studio 会自动启动 MCP 子进程，**不需要**手动 `npm start`。

或一次性运行：

```bash
npx lmstudio-mcp-local
```

建议复制 `lmstudio-mcp.example.json` 为 `lmstudio-mcp.json` 并配置 `allowedPaths`（Windows 上比 `.env` 更可靠）。

### 方式 B：从源码运行

```bash
git clone https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath.git LMStudio-MCP-Locally
cd LMStudio-MCP-Locally
npm install
npm run build
```

### 1. 配置本地路径白名单

> **两个容易混淆的配置文件**
>
> | 文件                                                                      | 用途                                                     |
> | ------------------------------------------------------------------------- | -------------------------------------------------------- |
> | **`~/.lmstudio/mcp.json`**（Windows：`C:\Users\<你>\.lmstudio\mcp.json`） | LM Studio 的 MCP 列表 — 在第 3 步添加 `command` + `args` |
> | **`lmstudio-mcp.json`**（安装目录 / 通过 `MCP_CONFIG` 指定）              | 本服务器的路径白名单 — **不要**在 LM Studio UI 里编辑    |

复制 `lmstudio-mcp.example.json` 为项目根目录的 `lmstudio-mcp.json`（或在 `mcp.json` 的 `env` 里用 `MCP_CONFIG` 指向其完整路径）：

```json
{
  "security": {
    "allowedPaths": ["F:/Documents", "F:/Projects"]
  }
}
```

可选 `.env`（Windows 用**分号**分隔路径，或优先用上面的 JSON）：

```env
# Windows 示例
MCP_ALLOWED_PATHS=F:/Documents;F:/Projects

# macOS / Linux 示例
# MCP_ALLOWED_PATHS=/Users/me/Documents:/Users/me/Projects
```

### 2. 启动 LM Studio

1. 打开 LM Studio
2. **Load** 一个模型
3. 开启 **Local Server / API**（默认 1234）— `reason_over_file` 需要
4. 在 Chat 设置中启用 **Tool use**（若模型支持）

### 3. 在 LM Studio 添加 MCP Server

LM Studio 以子进程方式 **spawn** 本服务器，通过 stdio 通信 — 无需单独 `npm start`，无需 8080。

1. LM Studio → **Program** → **Install** → **Edit mcp.json**
2. 配置文件：`~/.lmstudio/mcp.json`（Windows：`C:\Users\<你>\.lmstudio\mcp.json`）
3. 在 `mcpServers` 下添加 `command` 项。**保留**已有服务器（如 `browser`）。**删除**旧的 `"url": "http://127.0.0.1:8080/mcp"`：

```json
{
  "mcpServers": {
    "browser": {
      "command": "node",
      "args": ["G:/Lmstudio/LM Studio/.lmstudio/plugins/mcp/browser/index.js"]
    },
    "lmstudio-mcp-local": {
      "command": "node",
      "args": ["F:/path/to/lmstudio-mcp-locally/dist/index.js"],
      "env": {
        "MCP_CONFIG": "F:/path/to/lmstudio-mcp-locally/lmstudio-mcp.json",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

- **`browser`** — stdio MCP，由 LM Studio 通过 `command` + `args` 启动
- **`lmstudio-mcp-local`** — stdio MCP，LM Studio 启动时自动拉起
- **`MCP_CONFIG`** — `lmstudio-mcp.json` 的完整路径（LM Studio 工作目录通常不是项目目录时必须设置）
- 全局安装后可用：`"command": "lmstudio-mcp-local"`，`"args": []`（确保 npm 全局 bin 在 PATH 中）

4. 保存合法 JSON，重启或重载 LM Studio
5. 在 Chat 中应看到 **7 个本地文件工具**

### 4. 验证本地路径可读

在 LM Studio Chat 中输入：

```
请读取 F:/Documents/test.txt 的内容
```

若提示 `Path not in allowlist`，将该目录加入 `lmstudio-mcp.json` 后重启 LM Studio（以重新 spawn MCP 进程）。

---

## 可用工具

| 工具                  | 说明                                |
| --------------------- | ----------------------------------- |
| `read_file`           | 读取单个本地文件                    |
| `list_directory`      | 浏览目录                            |
| `search_in_file`      | 在文件内关键词搜索（字面匹配）      |
| `read_multiple_files` | 一次读取多个文件                    |
| `find_files`          | 按文件名 / glob 查找文件            |
| `reason_over_file`    | 读文件后调用本机 LM Studio 模型推理 |
| `get_file_info`       | 获取文件元数据（不读内容）          |

---

## 配置

### 配置文件查找顺序（`lmstudio-mcp.json`）

1. 环境变量 `MCP_CONFIG`（在 `~/.lmstudio/mcp.json` 的 `env` 中设置）
2. `{安装目录}/lmstudio-mcp.json`（与 `package.json` 同级）
3. `~/.config/lmstudio-mcp/config.json`
4. 当前工作目录下的 `./lmstudio-mcp.json`

### 高级：`--http` 调试模式

仅用于 `/health` 检查或 curl 调试 — **不是** LM Studio 正式接入方式：

```bash
npm run start:http
```

访问 `http://127.0.0.1:8080/health`。修改端口：在 `.env` 或 `lmstudio-mcp.json` 中设置 `MCP_PORT` / `server.port`。

### 完整配置示例（`lmstudio-mcp.json`）

此文件配置**本 MCP 服务器**（白名单等）— 不是 LM Studio 的 `~/.lmstudio/mcp.json`。`server.port` 仅对 `--http` 调试有效。

```json
{
  "security": {
    "allowedPaths": ["F:/Documents"],
    "maxFileSize": 52428800,
    "blockedExtensions": [".exe", ".key", ".env"],
    "enforcePathGuard": true
  },
  "reading": {
    "maxCharsPerRead": 200000,
    "maxListEntries": 500,
    "followSymlinks": false
  },
  "reasoning": {
    "lmStudioUrl": "http://127.0.0.1:1234",
    "model": "local-model",
    "maxContextTokens": 8192,
    "temperature": 0.1
  }
}
```

---

## 安全说明

- **路径白名单** — 只能读取 `allowedPaths` 内的文件，LM Studio 侧无法绕过
- **扩展名黑名单** — `.exe`、`.dll`、`.key`、`.pem`、`.env` 等始终禁止
- **文件大小上限** — 默认 50MB，可配置
- **仅本地** — 正常使用 stdio，不监听网络端口
- **`reason_over_file`** — 仅调用本机 LM Studio API，不上云

---

## 故障排查

**Chat 中看不到工具** — 确认 `mcp.json` 中 `dist/index.js` 路径正确、已 `npm run build`、已重启 LM Studio。删除旧的 `"url": "http://127.0.0.1:8080/mcp"`。

**Spawn / 初始化失败** — 确认 Node.js ≥ 22 在 PATH 中。手动测试：`node /完整路径/dist/index.js --help`。`args` 应指向 `dist/index.js`，不是 `src/index.ts`。

**白名单未生效** — LM Studio 工作目录通常不是项目目录。在 `mcp.json` 的 `env` 中设置 `MCP_CONFIG` 为 `lmstudio-mcp.json` 的完整路径。

**LM Studio 不可达** — 确认 LM Studio 已打开、模型已加载、本地 API 已开启（仅 `reason_over_file` 需要）。

**Path not in allowlist** — 将目录加入 `lmstudio-mcp.json`。Windows 配置建议用正斜杠（如 `F:/Projects`）。

**模型说无法访问本地文件** — MCP 服务通常正常，是模型**没有调用工具**。开启 Chat 的 **Tool use**。优先选用支持函数调用的模型。

**`Failed to parse tool call`** — 模型工具输出格式与 LM Studio 解析器不匹配。换模型，或明确要求用 JSON 参数调用 `read_file`。

**工具调用无反应** — LM Studio 首次需要授权。点击 **Allow** 或 **Always allow any tool from mcp/lmstudio-mcp-local**。

**确认工具已执行** — 在 `mcp.json` 的 `env` 或 `.env` 中设 `MCP_DEBUG=true`，重启 LM Studio。stdio 模式下日志输出到 **stderr**（stdout 专用于 MCP 协议）。查找 `[tool] read_file → …ms ✓`。

**`Plugin(mcp/browser): server.getTools is not a function`** — LM Studio 自带 browser 插件问题，与本项目无关。

**模型不调用工具** — 启用 Tool use；测试时可暂时减少其他插件干扰。

**仅 HTTP 调试：端口被占用** — 可能有旧的 `--http` 实例：

```powershell
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

---

## 开发

```bash
npm run dev    # 热重载开发
npm run build  # 编译到 dist/
```

---

## 相关链接

- [GitHub 仓库](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath)
- [提交 Issue](https://github.com/tomaxtoLuca/LMStudio-MCP-LocalPath/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [LM Studio](https://lmstudio.ai/)（第三方产品，无隶属关系）
