import { ApplicationConfig } from '@loopback/core';
import { OrchestrationApplication } from './application';

// Read required data from environment variables
const {PORT, USER_API, PROJECTS_API, JOBS_API, MONITOR_API, AMQP_URL, AMQP_PORT, AMQP_USER, AMQP_PWD, TEST_IMAGE, CF_MONITOR_IMAGE} = process.env;

/**
 * Main entry point to start this service
 *
 * @param options - Server options
 */
export async function main(options: ApplicationConfig = {}): Promise<OrchestrationApplication> {
    options.port = options.port || PORT;
    options.apis = {
        userApi: USER_API,
        projectsApi: PROJECTS_API,
        jobsApi: JOBS_API,
        monitorApi: MONITOR_API
    };
    options.amqp = {
        url: AMQP_URL,
        port: (options.amqp || {}).port || AMQP_PORT,
        user: AMQP_USER,
        pwd: AMQP_PWD
    };
    options.kubernetes = {
        testImage: TEST_IMAGE,
        cfMonitorImage: CF_MONITOR_IMAGE
    };

    const app = new OrchestrationApplication(options);

    await app.start();

    console.log(`Server is running on port ${app.options.port}`);
    return app;
}
