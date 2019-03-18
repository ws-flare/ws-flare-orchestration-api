import { Application, CoreBindings } from '@loopback/core';
import { Context, inject } from '@loopback/context';
import { Connection, ConsumeMessage } from 'amqplib';
import { NodesService } from './services/Nodes.service';

export class Server extends Context implements Server {
    private _listening: boolean = false;

    @inject('amqp.conn')
    private amqpConn: Connection;

    @inject('queue.job.create')
    private createJobQueue: string;

    @inject('services.nodes')
    private nodesService: NodesService;

    constructor(@inject(CoreBindings.APPLICATION_INSTANCE) public app?: Application) {
        super(app);
    }

    get listening() {
        return this._listening;
    }

    async start(): Promise<void> {
        const createJobChannel = await this.amqpConn.createChannel();

        await createJobChannel.assertQueue(this.createJobQueue);

        await createJobChannel.consume(this.createJobQueue, async (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());

            await this.nodesService.runTest(parsed.job, parsed.task);
        }, {noAck: true});
    }

    async stop(): Promise<void> {
        await this.amqpConn.close();
    }
}
