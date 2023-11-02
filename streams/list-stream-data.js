/*
    This example demonstrates how to get streams from given facility and get their data.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, Encoding, QC,
    getDefaultModel
} from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const OFFSET_DAYS = 5;

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

    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    const now = new Date();
    const to = now.getTime();
    const from = new Date(now.getTime() - OFFSET_DAYS * 24 * 60 * 60 * 1000).getTime();

    for (const stream of streams) {
        // STEP 4 - get stream data for last NN days and print their values
        const streamKey = Encoding.toFullKey(stream[QC.Key], true);

        console.log(`${stream[QC.Name]}`);
        const data = await client.getStreamData(defaultModel.modelId, streamKey, from, to);
        for (const item in data) {
            console.log(`  ${item}`);
            const values = data[item];

            for (const ts in values) {
                const date = new Date(parseInt(ts));
                
                console.log(`    [${date.toLocaleString()}]: ${values[ts]}`);
            }
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

