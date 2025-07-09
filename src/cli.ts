#!/usr/bin/env node

import { Command } from 'commander';
import { compileProtobuf } from './index';
import { resolve } from 'path';
import { existsSync } from 'fs';

const program = new Command();

program
    .name('game-protoc')
    .description('一个支持序列化的 TypeScript protobuf 编译器，专为游戏服务器设计')
    .version('1.0.0');

program
    .argument('<input>', '包含 .proto 文件的输入目录')
    .argument('<output>', '生成 TypeScript 文件的输出目录')
    .option('-v, --verbose', '启用详细输出', false)
    .option('-r, --relative', '使用相对路径而不是绝对路径', false)
    .action(async (input: string, output: string, options) => {
        try {
            // 解析路径
            const inputPath = options.relative ? input : resolve(input);
            const outputPath = options.relative ? output : resolve(output);
            
            // 验证输入目录是否存在
            if (!existsSync(inputPath)) {
                console.error(`错误: 输入目录不存在: ${inputPath}`);
                process.exit(1);
            }
            
            if (options.verbose) {
                console.log(`输入目录: ${inputPath}`);
                console.log(`输出目录: ${outputPath}`);
            }
            
            await compileProtobuf({
                input: inputPath,
                output: outputPath,
                verbose: options.verbose
            });
            
            console.log('✅ 编译完成!');
        } catch (error) {
            console.error('❌ 编译失败:', error);
            process.exit(1);
        }
    });

program.parse();
