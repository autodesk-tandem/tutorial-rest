/*
    This example demonstrates how to find parent element (= host) of stream.
    
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
    const streamData = [];

    // STEP 4 - get parent data
    for (const stream of streams) {
        if (!stream[QC.XParent]) {
            console.log(`Stream ${stream[QC.Name]} has no parent`);
            continue;
        }
        // STEP 5 - decode and key of parent element. We don't need to store
        // model id - streams can be only linked to elements within the default model
        const [ _, parentKey ] = Encoding.fromXrefKey(stream[QC.XParent]);
        
        streamData.push({
            id: stream[QC.Key],
            name: stream[QC.OName] ?? stream[QC.Name],
            parent: {
                key: parentKey
            }
        });
    }
    // STEP 6 - build list of parent keys
    const parentKeys = [...new Set(streamData.map(item => item.parent.key))];

    // STEP 7 - get parent names
    if (parentKeys.length === 0) {
        console.log('No parent keys found');
        return;
    }
    const elements = await client.getElements(defaultModel.modelId, parentKeys);
    const parentNameById = new Map(elements.map(e => [e[QC.Key], e[QC.OName] ?? e[QC.Name]]));

    // STEP 8 - print results (stream name - parent name)
    for (const item of streamData) {
        console.log(`${item.name} (${item.id}) -> ${parentNameById.get(item.parent.key)} (${item.parent.key})`);
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

