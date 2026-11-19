/*
    This example demonstrates how to read stream settings (thresholds).
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
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
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);

    for (const stream of streams) {
        const name = stream[QC.OName] ?? stream[QC.Name];

        console.log(`Stream: ${name}`);
        // STEP 4 - get stream settings
        const streamSettings = stream[QC.Settings];

        if (!streamSettings) {
            continue;
        }
        // STEP 5 - decode settings and print thresholds
        const settings = Encoding.decodeStreamSettings(streamSettings);

        console.log(`  Thresholds:`);
        for (const [key, threshold] of Object.entries(settings.thresholds)) {
            console.log(`    ${threshold.name}`);
            if (threshold.lower) {
                printThreshold('lower', threshold.lower, 6);
            }
            if (threshold.upper) {
                printThreshold('upper', threshold.upper, 6);
            }
        }
    }
}

function printThreshold(label, threshold, spaces) {
    console.log(`${' '.repeat(spaces)}${label}:`);
    for (const [key, value] of Object.entries(threshold)) {
        console.log(`${' '.repeat(spaces + 2)}${key}: ${value}`);
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

