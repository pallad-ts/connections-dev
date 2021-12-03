export interface Connection<T> {
    readonly connection: T;

    start(): Promise<T>;

    stop(): Promise<void>;

    setupBeforeAndAfterAll(opts?: Connection.BeforeAfterOptions): void;
}


export namespace Connection {
    export interface BeforeAfterOptions {
        beforeTimeout?: number;
        afterTimeout?: number;
    }
}
