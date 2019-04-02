import { Channel, ConsumeMessage } from 'amqplib';
import { Container, getAMQPConn, setupK8sConfig, startMqContainer } from './test-helpers';
import * as nock from 'nock';
import { expect } from 'chai';
import { OrchestrationApplication } from '../application';
import { main } from '..';
import { Task } from '../models/Task.model';

describe('Orchestration', () => {

    const createJobQueue = 'job.create';
    const startTestExchange = 'job.start.job1';
    const cfMonitorReadyQueue = 'cfMonitor.ready.my-test-node1';
    const nodeReadyQueue = 'node.ready.my-test-node1';
    const nodeCompleteQueue = 'node.complete.job1';
    const jobCompleteQueue = 'job.complete.job1';

    let app: OrchestrationApplication;
    let container: Container;
    let port: number;
    let createJobChannel: Channel;
    let startTestChannel: Channel;
    let nodeReadyChannel: Channel;
    let nodeCompleteChannel: Channel;
    let jobCompleteChannel: Channel;
    let qok: any;

    beforeEach(async () => {
        ({container, port} = await startMqContainer());

        setupK8sConfig();

        process.env.NODE_ID = 'my-test-node1';

        app = await main({amqp: {port}});

        const conn = await getAMQPConn(port);
        createJobChannel = await conn.createChannel();
        startTestChannel = await conn.createChannel();
        nodeReadyChannel = await conn.createChannel();
        nodeCompleteChannel = await conn.createChannel();
        jobCompleteChannel = await conn.createChannel();

        await createJobChannel.assertQueue(createJobQueue);
        await nodeReadyChannel.assertQueue(cfMonitorReadyQueue);
        await nodeReadyChannel.assertQueue(nodeReadyQueue);
        await nodeCompleteChannel.assertQueue(nodeCompleteQueue);
        await jobCompleteChannel.assertQueue(jobCompleteQueue);

        qok = await startTestChannel.assertExchange(startTestExchange, 'fanout', {durable: false});

        await startTestChannel.assertQueue('', {exclusive: true});

        await startTestChannel.bindQueue(qok.queue, startTestExchange, '');
    });

    afterEach(async () => {
        await app.stop();
        await container.stop();

        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    it('should start a test job', async () => {
        const k8sCfMonitorStart = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods/, 'POST')
            .reply(200, {status: {}});

        const k8sAPiOne = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods/, 'POST')
            .reply(200, {status: {}});

        const k8sAPiTwo = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods/, 'POST')
            .reply(200, {status: {}});

        const k8sAPiThree = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods/, 'POST')
            .reply(200, {status: {}});

        await createJobChannel.sendToQueue(createJobQueue, new Buffer((JSON.stringify({
            taskId: 'abc123',
            job: {id: 'job1', userId: 'user1', taskId: 'task1', isRunning: true, passed: false},
            task: {
                id: 'abc1',
                userId: 'user1',
                projectId: 'project1',
                name: 'task1',
                scripts: [
                    {
                        target: 'ws://localhost',
                        start: 0,
                        totalSimulators: 1000,
                        timeout: 30
                    },
                    {
                        target: 'ws://localhost',
                        start: 0,
                        totalSimulators: 1067,
                        timeout: 30
                    }
                ],
                cfApi: 'http://cf.com',
                cfUser: 'user1',
                cfPass: 'pass1',
                cfOrg: 'org1',
                cfSpace: 'space1',
                cfApps: 'app1,app2,app3'
            } as Task
        }))));

        await new Promise(resolve => setTimeout(() => resolve(), 1000));

        await nodeReadyChannel.sendToQueue(cfMonitorReadyQueue, new Buffer((JSON.stringify({ready: true}))));

        await new Promise(resolve => setTimeout(() => resolve(), 1000));

        await nodeReadyChannel.sendToQueue(nodeReadyQueue, new Buffer((JSON.stringify({ready: true}))));

        await new Promise(resolve => setTimeout(() => resolve(), 1000));

        await nodeReadyChannel.sendToQueue(nodeReadyQueue, new Buffer((JSON.stringify({ready: true}))));
        await nodeReadyChannel.sendToQueue(nodeReadyQueue, new Buffer((JSON.stringify({ready: true}))));

        await new Promise(resolve => setTimeout(() => resolve(), 1000));

        expect(k8sCfMonitorStart.isDone()).to.eql(true);
        expect(k8sAPiOne.isDone()).to.eql(true);
        expect(k8sAPiTwo.isDone()).to.eql(true);
        expect(k8sAPiThree.isDone()).to.eql(true);

        let messageReceived = false;
        let jobCompleted = false;

        await startTestChannel.consume(qok.queue, async (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());
            expect(parsed).to.eql({
                start: true, scripts: [
                    {
                        target: 'ws://localhost',
                        start: 0,
                        totalSimulators: 1000,
                        timeout: 30
                    },
                    {
                        target: 'ws://localhost',
                        start: 0,
                        totalSimulators: 1067,
                        timeout: 30
                    }
                ]
            });
            messageReceived = true;
        }, {noAck: true});

        await jobCompleteChannel.consume(jobCompleteQueue, async (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());
            expect(parsed).to.eql({done: true});
            jobCompleted = true;
        }, {noAck: true});

        await nodeReadyChannel.sendToQueue(nodeCompleteQueue, new Buffer((JSON.stringify({done: true}))));
        await nodeReadyChannel.sendToQueue(nodeCompleteQueue, new Buffer((JSON.stringify({done: true}))));
        await nodeReadyChannel.sendToQueue(nodeCompleteQueue, new Buffer((JSON.stringify({done: true}))));

        await new Promise(resolve => setTimeout(() => resolve(), 1000));

        expect(messageReceived).to.equal(true);
        expect(jobCompleted).to.equal(true);
    });
});
