/*
    This example demonstrates how to apply override to stream configuration.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from '../common/constants.js';
import { getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const STREAM_NAME = 'Test Stream'; // name of the stream to apply override
const PARAMETER_NAME = 'Temperature'; // parameter to map in all streams
const INPUT_PATH = 'temp'; // mapping path in the source data

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
    // STEP 4 - find stream by name. Check both name and name override
    const stream = streams.find(s => (s[QC.OName] ?? s[QC.Name])?.toLowerCase() === STREAM_NAME.toLowerCase());

    if (!stream) {
        throw new Error(`Stream not found: ${STREAM_NAME}`);
    }
    // STEP 5 - get model schema to find property id by its name
    const schema = await client.getModelSchema(defaultModel.modelId);
    const propDef = schema.attributes.find(a => a.name === PARAMETER_NAME);

    if (!propDef) {
        throw new Error(`Property not found in schema: ${PARAMETER_NAME}`);
    }
    // STEP 6 - read existing stream configuration
    const config = await client.getStreamConfig(defaultModel.modelId, stream[QC.Key]);
    // STEP 7 - update stream configuration to add override for given parameter
    const settings = config.streamSettings || {};
    let mapping = settings.sourceMapping;

    if (!mapping) {
        mapping = {};
        settings.sourceMapping = mapping;
    }
    mapping[propDef.id] = {
        path: INPUT_PATH, // mapping path in the source data
        isShared: false // indicate it's override for this stream only
    };

    await client.saveStreamConfig(defaultModel.modelId, stream[QC.Key], {
        description: 'Apply configuration override',
        streamConfig: {
            streamSettings: settings
        }
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

