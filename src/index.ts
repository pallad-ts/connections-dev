import {PostgresConnection} from "./Connections/PostgresConnection";
import * as is from 'predicates';

const assertConfig = is.assert(is.obj, 'Config is missing');

export function createConnections(config: Config): Result {
    let _postgres: PostgresConnection;
    return {
        get postgres() {
            if (!_postgres) {
                assertConfig(config.postgres);
                _postgres = new PostgresConnection(config.postgres);
            }
            return _postgres;
        }
    }
}

export interface Config {
    postgres: PostgresConnection.Config
}

export interface Result {
    postgres: PostgresConnection;
}