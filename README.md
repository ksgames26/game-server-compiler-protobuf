# 游戏服务器 Protobuf 编译器

一个支持序列化的 TypeScript protobuf 编译器，专为游戏服务器设计。

## 特性

- 🚀 TypeScript protobuf 编译
- 🎯 自动序列化注册
- 🔧 CRC32 protoId 生成
- 📦 NPM 包支持
- 🛠️ 命令行接口

### 命令行接口

```bash
# 基本用法
game-protoc <输入目录> <输出目录>

# 带详细输出
game-protoc ./proto ./src/protocol --verbose

# 使用相对路径
game-protoc ./proto ./src/protocol --relative

# 帮助
game-protoc --help
```

### 编程接口

```typescript
import { compileProtobuf } from 'game-server-compiler-protobuf';

await compileProtobuf({
    input: './proto',
    output: './src/protocol',
    verbose: true
});
```

### 环境变量（向后兼容）

您也可以使用环境变量来保持向后兼容：

```bash
export PROTOCOL_PATH="../protocol"
export PROTOCOL_SCRIPT="./src/protocol"
```

## 功能说明

1. **编译 .proto 文件** 使用 `protoc` 生成 TypeScript 代码
2. **添加序列化支持** 通过从 `@gf-core/core/container` 导入 Container
3. **生成 CRC32 protoId** 为每个消息类型生成唯一标识
4. **自动注册序列化实例** 自动处理序列化系统注册
5. **创建 protocol.ts 文件** 导入所有生成的文件

## 生成的代码结构

对于每个 `.proto` 文件，工具会：

- 生成 TypeScript 定义
- 添加 `IGameFramework.ISerializer` 接口实现
- 添加带有 CRC32 值的 `protoId` 获取器
- 向序列化系统注册实例

## 示例

输入：`message.proto`
```protobuf
syntax = "proto3";

message PlayerInfo {
    string name = 1;
    int32 level = 2;
}
```

输出：增强的 TypeScript 代码，支持序列化

## 环境要求

- Node.js >= 16.0.0
- @protobuf-ts/plugin 插件用于 TypeScript 生成
- TypeScript 项目

## 开发

```bash
# 克隆仓库
git clone https://github.com/ksgames26/game-server-compiler-protobuf.git

# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 开发模式运行
pnpm run dev
```

## 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
