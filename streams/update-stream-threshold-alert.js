/*
    This example demonstrates how to apply threshold alert.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const PARAMETER_NAME = 'Temperature'; // parameter to map in all streams
const ALERT_INTERVAL = 300; // alert evaluation period in seconds

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    // STEP 2 - get facility and default model. The default model has same id as facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Default model not found');
    }
    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    // STEP 4 - get model schema to find property id by its name
    const schema = await client.getModelSchema(defaultModel.modelId);
    const propDef = schema.attributes.find(a => a.name === PARAMETER_NAME);

    if (!propDef) {
        throw new Error(`Property not found in schema: ${PARAMETER_NAME}`);
    }
    // STEP 5 - read existing stream configuration
    const configs = await client.getStreamConfigs(defaultModel.modelId);
    // STEP 6 - iterate through stream configurations and update threshold alert for given parameter.
    // Note that we need to update whole configuration, partial update is not supported.
    // We will only update configuration which has threshold for given parameter.
    const newConfigs = [];

    for (const config of configs) {
        const settings = config.streamSettings;

        if (!settings) {
            continue;
        }
        const threshold = settings.thresholds?.[propDef.id];

        if (!threshold) {
            continue;
        }
        // STEP 7 - update alert settings for given  parameter
        const alertDefinition = threshold.alertDefinition || {};

        alertDefinition.evaluationPeriodSec = ALERT_INTERVAL; // set alert evaluation period to 300 seconds
        newConfigs.push(config);
    }
    // STEP 7 - save changes
    await client.updateStreamConfigs(defaultModel.modelId, {
        description: 'Update stream configuration',
        streamConfigs: newConfigs
    });
    console.log(`Done`);
}

main()
    .then(() => {
        console.log('success');
        process.exit(0);
    })
    .catch((err) => {
        console.error('failure', err);
        process.exit(1);
    });

