/*
    This example demonstrates how to update stream configuration.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from '../common/constants.js';
import { Encoding, getDefaultModel } from '../common/utils.js';

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
    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    const keys = streams.map(s => s[QC.Key]);
    // STEP 5 - get model schema to find property id by its name
    const schema = await client.getModelSchema(defaultModel.modelId);
    const propDef = schema.attributes.find(a => a.name === PARAMETER_NAME);

    if (!propDef) {
        throw new Error(`Property not found in schema: ${PARAMETER_NAME}`);
    }
    // STEP 6 - prepare configurations for all streams. This will overwrite existing configurations
    const configs = [];

    for (const key of keys) {
        const config = {
            elementId: Encoding.toFullKey(key, true),
            streamSettings: {
                sourceMapping: {
                    [propDef.id]: {
                        path: PARAMETER_NAME.toLowerCase(), // mapping path in the source data - it's same as parameter name in lowercase
                        isShared: true
                    }
                },
                // no thresholds in this example
                thresholds: {}
            }
        };

        configs.push(config);
    }
    await client.updateStreamConfigs(defaultModel.modelId, {
        description: 'Update configuration',
        streamConfigs: configs
    });

    console.log(`Updated stream configs`);
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

