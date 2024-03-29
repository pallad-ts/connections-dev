import {createMigrator, Loader} from "@pallad/migrator-core";
import {StateManager} from "@pallad/migrator-sql-state";
import {Connection} from "./Connection";
import {Knex, knex} from 'knex';

export class PostgresConnection implements Connection<Knex> {
    readonly connection: Knex;

    private hasMigrated: boolean = false;

    constructor(private config: PostgresConnection.Config) {

        const {connection, knexOptions = {}} = this.config;
        this.connection = knex({
            client: 'pg',
            connection,
            ...knexOptions
        });
    }

    setupBeforeAndAfterAll(opts: Connection.BeforeAfterOptions = {beforeTimeout: 30000, afterTimeout: 10000}): void {
        beforeAll(async () => {
            const timeout = opts.beforeTimeout ?? 30000;
            timeout && jest.setTimeout(timeout);
            await this.start()
        });
        afterAll(async () => {
            const timeout = opts.afterTimeout ?? 10000;
            timeout && jest.setTimeout(timeout);
            await this.stop();
        });
    }

    getMigrator() {
        if (!this.config.getMigratorLoaders) {
            return;
        }
        const loaders = this.config.getMigratorLoaders(this.connection);
        if (loaders.length === 0) {
            return;
        }
        return createMigrator({
            loaders: this.config.getMigratorLoaders ? this.config.getMigratorLoaders(this.connection) : [],
            stateManager: StateManager.create({
                knex: this.connection,
                table: 'migrations'
            })
        });
    }

    async migrateToLatest() {
        if (this.hasMigrated) {
            return;
        }
        this.hasMigrated = true;

        const migrator = await this.getMigrator();
        if (!migrator) {
            return;
        }
        const observer = await migrator.runTo('up');
        await new Promise((resolve, reject) => {
            observer.subscribe({
                complete: () => resolve(undefined),
                error: reject
            });
        });
    }

    async start(): Promise<Knex> {
        await this.migrateToLatest();
        return this.connection;
    }

    async stop(): Promise<void> {
        await this.connection.destroy();
    }

    setupAfterEach(opts: { truncateTables: string[], timeout?: number }) {
        afterEach(async () => {
            const timeout = opts.timeout ?? 10000;
            timeout && jest.setTimeout(timeout);
            await this.truncateTables(...opts.truncateTables);
        });
    }

    truncateTables(...tables: string[]) {
        return Promise.all(tables.map(t => {
            return this.connection.raw(`TRUNCATE TABLE ${this.connection.ref(t)} CASCADE`);
        }));
    }
}

export namespace PostgresConnection {
    export interface Config {
        connection: NonNullable<Knex.Config['connection']>;
        knexOptions?: Omit<Knex.Config, 'connection'>;
        getMigratorLoaders?: (knex: Knex) => Loader[];
    }
}
