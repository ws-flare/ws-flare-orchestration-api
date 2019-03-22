import { Channel, ConsumeMessage } from 'amqplib';
import { Container, getAMQPConn, setupK8sConfig, startMqContainer } from './test-helpers';
import * as nock from 'nock';
import { expect } from 'chai';
import { OrchestrationApplication } from '../application';
import { main } from '..';

describe('Orchestration', () => {

    const createJobQueue = 'job.create';
    const startTestExchange = 'job.start.job1';

    let app: OrchestrationApplication;
    let container: Container;
    let port: number;
    let createJobChannel: Channel;
    let startTestChannel: Channel;
    let qok: any;

    beforeEach(async () => {
        ({container, port} = await startMqContainer());

        setupK8sConfig();

        app = await main({amqp: {port}});

        const conn = await getAMQPConn(port);
        createJobChannel = await conn.createChannel();
        startTestChannel = await conn.createChannel();
        await createJobChannel.assertQueue(createJobQueue);

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
        const k8sAPiOne = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods/, 'POST')
            .reply(200, {status: {}});

        const k8sAPiTwo = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods/, 'POST')
            .reply(200, {status: {}});

        const k8sAPiThree = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods/, 'POST')
            .reply(200, {status: {}});

        nock('http://localhost:9000')
            .get(/\/api\/v1\/namespaces\/default\/pods\/.*\/status/)
            .thrice()
            .reply(200, {status: {phase: 'Running'}});

        await createJobChannel.sendToQueue(createJobQueue, new Buffer((JSON.stringify({
            taskId: 'abc123',
            job: {id: 'job1', userId: 'user1', taskId: 'task1', isRunning: true, passed: false},
            task: {
                id: 'abc1',
                userId: 'user1',
                projectId: 'project1',
                name: 'task1',
                uri: 'ws://localhost',
                totalSimulatedUsers: 2067,
                runTime: 1000
            }
        }))));

        await new Promise(resolve => setTimeout(() => resolve(), 1000));

        expect(k8sAPiOne.isDone()).to.eql(true);
        expect(k8sAPiTwo.isDone()).to.eql(true);
        expect(k8sAPiThree.isDone()).to.eql(true);

        let messageReceived = false;

        await startTestChannel.consume(qok.queue, (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());
            expect(parsed).to.eql({start: true});
            messageReceived = true;
        }, {noAck: true});

        expect(messageReceived).to.equal(true);
    });
});
