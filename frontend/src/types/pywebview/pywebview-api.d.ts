export declare class TranscriptionSegment {
    id: number;
    text: string;
    start: number;
    end: number;
    args?: any;
    kwargs?: any;
    constructor(args: any, kwargs: any);
}
export declare function createTranscriptionSegment(options?: Partial<TranscriptionSegment>): TranscriptionSegment;
export declare class dict {
    args?: any;
    kwargs?: any;
    constructor(args: any, kwargs: any);
}
export declare function createdict(options?: Partial<dict>): dict;
export declare class PyWebViewApi {
    private _instanceId?;
    constructor(args?: Partial<PyWebViewApi>);
    open_file_dialog(): Promise<string | null>;
    run_transcription(file_path: string): Promise<TranscriptionSegment[]>;
    static createInstance(args?: Partial<PyWebViewApi>): Promise<PyWebViewApi>;
}
export type PyWebViewApiType = PyWebViewApi;
