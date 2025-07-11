import assert from 'assert/strict';
import { execSync } from "child_process";
import * as crc32 from 'crc-32';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "fs";
import { join, parse, resolve } from "path";
import { GetAccessorDeclarationStructure, Project, Scope, StructureKind, SyntaxKind } from "ts-morph";

export interface CompilerOptions {
    input: string;
    output: string;
    verbose?: boolean;
}

function removeFilesInDirectory(dirPath: string): void {
    try {
        const items = readdirSync(dirPath);

        for (const item of items) {
            const fullPath = join(dirPath, item);
            const stats = statSync(fullPath);

            if (stats.isFile()) {
                unlinkSync(fullPath);
            }
        }
    } catch (error) {
        console.error('删除文件失败:', error);
        throw error;
    }
}

export async function compileProtobuf(options: CompilerOptions): Promise<void> {
    const { input, output, verbose = false } = options;

    if (verbose) {
        console.log('开始编译protobuf文件...');
    }

    let protobufOutTemp = join(__dirname, ".protobufOutTemp");
    if (!existsSync(protobufOutTemp)) {
        mkdirSync(protobufOutTemp, { recursive: true });
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
        execSync(command, { stdio: verbose ? 'inherit' : 'pipe' });
    } catch (error) {
        console.error('编译protobuf失败:', error);
        removeFilesInDirectory(protobufOutTemp);
        throw error;
    }

    if (!existsSync(output)) {
        mkdirSync(output, { recursive: true });
    }

    removeFilesInDirectory(output);

    const project = new Project();
    const source = project.createSourceFile(`${output}/protocol.ts`);

    const files = readdirSync(protobufOutTemp);
    if (files.length > 0) {
        files.forEach(file => {
            let text = readFileSync(`${protobufOutTemp}/${file}`, "utf-8");
            writeFileSync(`${output}/${file}`, text);

            source.addImportDeclarations([
                {
                    isTypeOnly: false,
                    moduleSpecifier: `./${parse(file).name}`,
                },
            ]);

            const project = new Project();
            const sourceFile = project.addSourceFileAtPath(`${output}/${file}`);
            // 在添加,再添加容器
            sourceFile.addImportDeclarations([
                {
                    isTypeOnly: false,
                    namedImports: ["Container"],
                    moduleSpecifier: "@gf-core/core/container",
                },
            ]);

            const protoNames: Array<string> = [];

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
                    if (declaration.getKind() === SyntaxKind.VariableDeclaration) {
                        const varDecl = declaration.asKind(SyntaxKind.VariableDeclaration);
                        const initializer = varDecl?.getInitializer();

                        if (initializer?.getKind() === SyntaxKind.NewExpression) {
                            // 获取类声明
                            const classDeclaration = sourceFile.getClass(name + "$Type")!;
                            // 计算 CRC32 值
                            const crcValue = crc32.str(name); // 使用类名计算 CRC32
                            classDeclaration.addImplements(`IGameFramework.ISerializer`);
                            const getterStructure: GetAccessorDeclarationStructure = {
                                name: "protoId",
                                kind: StructureKind.GetAccessor,
                                returnType: "number",
                                statements: `return ${crcValue};`,
                                isStatic: false,        // 是否是静态方法
                                scope: Scope.Public         // 访问范围
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
    rmSync(protobufOutTemp, { recursive: true });

    if (verbose) {
        console.log('编译完成!');
    }
}

export async function main(): Promise<void> {
    assert(process.env.PROTOCOL_PATH, "请设置环境变量 PROTOCOL_PATH 配置文件路径");
    assert(process.env.PROTOCOL_SCRIPT, "请设置环境变量 PROTOCOL_SCRIPT 配置文件路径");

    const rootDir = resolve(__dirname, '../../');
    let input = join(rootDir, process.env.PROTOCOL_PATH ? process.env.PROTOCOL_PATH : "../protocol");
    const output = join(rootDir, process.env.PROTOCOL_SCRIPT ? process.env.PROTOCOL_SCRIPT : "./src/protocol");

    if (input.endsWith("/")) {
        input = input.slice(0, -1);
    }

    await compileProtobuf({ input, output, verbose: true });
}

// 如果作为主模块运行，则执行main函数
if (require.main === module) {
    main().catch(console.error);
}
