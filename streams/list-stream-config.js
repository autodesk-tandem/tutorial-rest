/*
    This example demonstrates how to read stream configuration (including thresholds).
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from '../common/constants.js';
import { Encoding, getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_UD';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');
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
    // STEP 4 - get stream configurations
    const streamConfigs = await client.getStreamConfigs(defaultModel.modelId);
    // STEP 5 - get model schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    
    for (const stream of streams) {
        // STEP 6 - find settings for stream by its key. Note that configuration uses full key
        const key = Encoding.toFullKey(stream[QC.Key], true);
        const config = streamConfigs.find(s => s.elementId === key);
        const settings = config ? config.streamSettings : null;
        
        if (!settings) {
            continue;
        }
        const name = stream[QC.OName] ?? stream[QC.Name];

        console.log(`Stream: ${name}`);
        // STEP 7 - iterate through stream parameters and print details including thresholds
        const thresholds = settings.thresholds;

        for (const [propId, mapping] of Object.entries(settings.sourceMapping)) {
            const propDef = schema.attributes.find(a => a.id === propId);

            if (!propDef) {
                console.log(`  Property: ${propId} (definition not found)`);
                continue;
            }
            const path = mapping.path;
            console.log(`  Property: ${propDef.name} (${propId}) -> ${path}`);
            const threshold = thresholds[propId];
            
            if (!threshold) {
                continue;
            }
            console.log(`  Threshold: ${threshold.name}`);
            if (threshold.lower) {
                console.log(`    lower:`);
                printThreshold(threshold.lower, 6);
            }
            if (threshold.upper) {
                console.log(`    upper:`);
                printThreshold(threshold.upper, 6);
            }
        }
    }
}

function printThreshold(threshold, spaces) {
    const keys = Object.keys(threshold);

    for (const key of keys) {
        console.log(`${Array(spaces + 1).join(' ')}${key}: ${threshold[key]}`);
    }
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
