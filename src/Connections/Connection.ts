
export interface Connection<T> {
    readonly connection: T;

    start(): Promise<T>;

    stop(): Promise<void>;

    setupBeforeAndAfterAll(): void;
}