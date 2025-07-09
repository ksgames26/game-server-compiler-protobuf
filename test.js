#!/usr/bin/env node

const { compileProtobuf } = require('./dist/index.js');
const path = require('path');

// 测试编程接口
async function testProgrammaticAPI() {
    try {
        console.log('正在测试编程接口...');
        
        // 这里使用相对路径作为示例
        const inputPath = path.resolve(__dirname, 'example/proto');
        const outputPath = path.resolve(__dirname, 'example/output');
        
        console.log(`输入目录: ${inputPath}`);
        console.log(`输出目录: ${outputPath}`);
        
        await compileProtobuf({
            input: inputPath,
            output: outputPath,
            verbose: true
        });
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 如果proto目录不存在，创建示例
const fs = require('fs');
const exampleDir = path.resolve(__dirname, 'example');
const protoDir = path.resolve(exampleDir, 'proto');

if (!fs.existsSync(protoDir)) {
    fs.mkdirSync(protoDir, { recursive: true });
    
    // 创建一个示例proto文件
    const sampleProto = `syntax = "proto3";

message PlayerInfo {
    string name = 1;
    int32 level = 2;
    repeated string items = 3;
}

message GameSession {
    string session_id = 1;
    PlayerInfo player = 2;
    int64 timestamp = 3;
}`;
    
    fs.writeFileSync(path.join(protoDir, 'example.proto'), sampleProto);
    console.log('已创建示例 proto 文件');
}

// 运行测试
testProgrammaticAPI();
