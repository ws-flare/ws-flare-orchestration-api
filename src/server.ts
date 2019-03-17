import {CoreBindings, Application} from '@loopback/core';
import {Context, inject} from '@loopback/context';
import * as express from 'express';
import {Logger} from 'winston';
import * as http from 'http';

export class Server extends Context implements Server {
    private _listening: boolean = false;
    private server: http.Server;

    @inject('logger')
    public logger: Logger;

    @inject('server.port')
    public port: number;

    constructor(@inject(CoreBindings.APPLICATION_INSTANCE) public app?: Application) {
        super(app);
    }

    get listening() {
        return this._listening;
    }

    async start(): Promise<void> {
        const expressServer = express();

        expressServer.get('/', (req, res) => res.send({uptime: process.uptime()}));
    }

    async stop(): Promise<void> {
        await this.server.close();
    }
}