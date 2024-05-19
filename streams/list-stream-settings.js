/*
    This example demonstrates how to read stream settings (thresholds).
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, QC, getDefaultModel } from '../common/utils.js';

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
        throw new Error('Default model not found');
    }
    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);

    for (const stream of streams) {
        // STEP 4 - get stream settings
        const streamSettings = stream[QC.Settings];

        if (!streamSettings) {
            continue;
        }
        // STEp 5 - decode settings and print thresholds
        const settings = Encoding.decode(streamSettings);

        if (!settings) {
            continue;
        }
        const settingsObj = JSON.parse(settings);

        console.log(`Stream: ${stream[QC.Name]}`);
        console.log(`  Thresholds:`);
        const keys = Object.keys(settingsObj.thresholds);

        for (const key of keys) {
            console.log(`    ${settingsObj.thresholds[key].name}`);
        }
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

