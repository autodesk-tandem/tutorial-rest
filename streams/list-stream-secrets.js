/*
    This example demonstrates how to get streams from given facility and their secrets.
    
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

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility. Note that we need to use data:write scope.
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    
    // STEP 2 - get facility and default model. The default model has same id as facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    // we need to convert stream keys to fully qualified key
    const keys = streams.map(s => s[QC.Key]);
    // STEP 4 - get streams secrets
    const data = await client.getStreamsSecrets(defaultModel.modelId, keys);

    // STEP 5 - print out stream name + secret
    for (const key in data) {
        // stream data are stored using short key
        const streamKey = Encoding.toShortKey(key);
        const streamSecret = data[key];
        const streamData = streams.find(s => s[QC.Key] === streamKey);
        const name = streamData[QC.OName] ?? streamData[QC.Name];

        console.log(`${name}: ${streamSecret}`);
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

