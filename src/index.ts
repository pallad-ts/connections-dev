import {PostgresConnection} from "./Connections/PostgresConnection";
import * as is from 'predicates';

const assertConfig = is.assert(is.obj, 'Config is missing');

export function createConnections(config: Config): Result {
    let postgresInstance: PostgresConnection;
    return {
        get postgres() {
            if (!postgresInstance) {
                assertConfig(config.postgres);
                postgresInstance = new PostgresConnection(config.postgres);
            }
            return postgresInstance;
        }
    }
}

export interface Config {
    postgres: PostgresConnection.Config
}

export interface Result {
    postgres: PostgresConnection;
}
