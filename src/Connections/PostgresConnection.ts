import {createMigrator, Loader} from "@pallad/migrator-core";
import {StateManager} from "@pallad/migrator-sql-state";
import {Connection} from "./Connection";
import Knex = require("knex");

export class PostgresConnection implements Connection<Knex> {
    readonly connection: Knex;

    private hasMigrated: boolean = false;

    constructor(private config: PostgresConnection.Config) {
        this.connection = Knex({
            client: 'pg',
            connection: this.config.connection
        });
    }

    setupBeforeAndAfterAll(): void {
        beforeAll(this.start.bind(this));
        afterAll(this.stop.bind(this));
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
                complete: resolve,
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

    setupAfterEach(opts: { truncateTables: string[] }) {
        afterEach(async () => {
            await this.truncateTables(...opts.truncateTables);
        });
    }

    truncateTables(...tables: string[]) {
        return Promise.all(tables.map(t => {
            return this.connection.raw('TRUNCATE TABLE ' + this.connection.ref(t));
        }));
    }
}

export namespace PostgresConnection {
    export interface Config {
        connection: NonNullable<Knex.Config['connection']>;
        getMigratorLoaders?: (knex: Knex) => Loader[];
    }
}