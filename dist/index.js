"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileProtobuf = compileProtobuf;
exports.main = main;
const strict_1 = __importDefault(require("assert/strict"));
const child_process_1 = require("child_process");
const crc32 = __importStar(require("crc-32"));
const fs_1 = require("fs");
const path_1 = require("path");
const ts_morph_1 = require("ts-morph");
function removeFilesInDirectory(dirPath) {
    try {
        const items = (0, fs_1.readdirSync)(dirPath);
        for (const item of items) {
            const fullPath = (0, path_1.join)(dirPath, item);
            const stats = (0, fs_1.statSync)(fullPath);
            if (stats.isFile()) {
                (0, fs_1.unlinkSync)(fullPath);
            }
        }
    }
    catch (error) {
        console.error('删除文件失败:', error);
        throw error;
    }
}
async function compileProtobuf(options) {
    const { input, output, verbose = false } = options;
    if (verbose) {
        console.log('开始编译protobuf文件...');
    }
    let protobufOutTemp = (0, path_1.join)(__dirname, ".protobufOutTemp");
    if (!(0, fs_1.existsSync)(protobufOutTemp)) {
        (0, fs_1.mkdirSync)(protobufOutTemp, { recursive: true });
    }
    removeFilesInDirectory(protobufOutTemp);
    if (verbose) {
        console.table({ input, output });
    }
    const command = `npx protoc --ts_out ${protobufOutTemp} --proto_path ${input} ${input}/*.proto --experimental_allow_proto3_optional`;
    if (verbose) {
        console.log("执行命令：", command);
    }
    try {
        (0, child_process_1.execSync)(command, { stdio: verbose ? 'inherit' : 'pipe' });
    }
    catch (error) {
        console.error('编译protobuf失败:', error);
        removeFilesInDirectory(protobufOutTemp);
        throw error;
    }
    if (!(0, fs_1.existsSync)(output)) {
        (0, fs_1.mkdirSync)(output, { recursive: true });
    }
    removeFilesInDirectory(output);
    const project = new ts_morph_1.Project();
    const source = project.createSourceFile(`${output}/protocol.ts`);
    const files = (0, fs_1.readdirSync)(protobufOutTemp);
    if (files.length > 0) {
        files.forEach(file => {
            let text = (0, fs_1.readFileSync)(`${protobufOutTemp}/${file}`, "utf-8");
            (0, fs_1.writeFileSync)(`${output}/${file}`, text);
            source.addImportDeclarations([
                {
                    isTypeOnly: false,
                    moduleSpecifier: `./${(0, path_1.parse)(file).name}`,
                },
            ]);
            const project = new ts_morph_1.Project();
            const sourceFile = project.addSourceFileAtPath(`${output}/${file}`);
            // 在添加,再添加容器
            sourceFile.addImportDeclarations([
                {
                    isTypeOnly: false,
                    namedImports: ["Container"],
                    moduleSpecifier: "@gf-core/core/container",
                },
            ]);
            const protoNames = [];
            const w = project.createWriter();
            w.newLine();
            w.write(`const serializable = Container.getInterface("IGameFramework.ISerializable");`);
            w.newLine();
            w.write(`if(serializable){`);
            // 获取所有导出的声明
            const exportedDeclarations = sourceFile.getExportedDeclarations();
            // 遍历所有导出
            exportedDeclarations.forEach((declarations, name) => {
                declarations.forEach(declaration => {
                    // 检查声明类型
                    if (declaration.getKind() === ts_morph_1.SyntaxKind.VariableDeclaration) {
                        const varDecl = declaration.asKind(ts_morph_1.SyntaxKind.VariableDeclaration);
                        const initializer = varDecl?.getInitializer();
                        if (initializer?.getKind() === ts_morph_1.SyntaxKind.NewExpression) {
                            // 获取类声明
                            const classDeclaration = sourceFile.getClass(name + "$Type");
                            // 计算 CRC32 值
                            const crcValue = crc32.str(name); // 使用类名计算 CRC32
                            classDeclaration.addImplements(`IGameFramework.ISerializer`);
                            const getterStructure = {
                                name: "protoId",
                                kind: ts_morph_1.StructureKind.GetAccessor,
                                returnType: "number",
                                statements: `return ${crcValue};`,
                                isStatic: false, // 是否是静态方法
                                scope: ts_morph_1.Scope.Public // 访问范围
                            };
                            classDeclaration.addGetAccessor(getterStructure);
                            w.write(`   serializable!.registerInst(${name});`);
                            w.newLine();
                            protoNames.push(name);
                        }
                    }
                });
            });
            w.write(`} else {`);
            w.newLine();
            protoNames.forEach(name => {
                w.write(`   Container!.addProtoType(${name});`);
                w.newLine();
            });
            w.write(`}`);
            sourceFile.insertText(sourceFile.getEnd(), w.toString());
            sourceFile.formatText();
            sourceFile.saveSync();
        });
    }
    source.saveSync();
    (0, fs_1.rmSync)(protobufOutTemp, { recursive: true });
    if (verbose) {
        console.log('编译完成!');
    }
}
async function main() {
    (0, strict_1.default)(process.env.PROTOCOL_PATH, "请设置环境变量 PROTOCOL_PATH 配置文件路径");
    (0, strict_1.default)(process.env.PROTOCOL_SCRIPT, "请设置环境变量 PROTOCOL_SCRIPT 配置文件路径");
    const rootDir = (0, path_1.resolve)(__dirname, '../../');
    let input = (0, path_1.join)(rootDir, process.env.PROTOCOL_PATH ? process.env.PROTOCOL_PATH : "../protocol");
    const output = (0, path_1.join)(rootDir, process.env.PROTOCOL_SCRIPT ? process.env.PROTOCOL_SCRIPT : "./src/protocol");
    if (input.endsWith("/")) {
        input = input.slice(0, -1);
    }
    await compileProtobuf({ input, output, verbose: true });
}
// 如果作为主模块运行，则执行main函数
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=index.js.map