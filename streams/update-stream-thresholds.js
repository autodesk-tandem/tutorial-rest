/*
    This example demonstrates how to update stream thresholds.
    
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
    // STEP 3 - get model schema to find property id by its name
    const schema = await client.getModelSchema(defaultModel.modelId);
    const propDef = schema.attributes.find(a => a.name === PARAMETER_NAME);

    if (!propDef) {
        throw new Error(`Property not found in schema: ${PARAMETER_NAME}`);
    }
    // STEP 4 - update configurations for all streams. Add threshold to temperature parameter.
    const configs = await client.getStreamConfigs(defaultModel.modelId);

    for (const config of configs) {
        const settings = config.streamSettings || {};

        if (!settings?.sourceMapping?.[propDef.id]) {
            continue;
        }
        let thresholds = settings.thresholds;

        if (!thresholds) {
            thresholds = {};
            settings.thresholds = thresholds;
        }
        thresholds[propDef.id] = {
            name: 'Temperature',
            lower: {
                warn: 18,
                alert: 15
            },
            upper: {
                warn: 23,
                alert: 25
            }
        };
    }
    // STEP 5 - update stream configurations in batch
    await client.updateStreamConfigs(defaultModel.modelId, {
        description: 'Update configuration',
        streamConfigs: configs
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

