export interface CompilerOptions {
    input: string;
    output: string;
    verbose?: boolean;
}
export declare function compileProtobuf(options: CompilerOptions): Promise<void>;
export declare function main(): Promise<void>;
//# sourceMappingURL=index.d.ts.map