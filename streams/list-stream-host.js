/*
    This example demonstrates how to find parent element (= host) of stream.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, QC } from '../common/constants.js';
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

    // STEP 3 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    const streamData = [];

    // STEP 4 - get parent data
    for (const stream of streams) {
        if (!stream[QC.XParent]) {
            console.log(`Stream ${stream[QC.Name]} has no parent`);
            continue;
        }
        // STEP 5 - decode and store model id and key of parent element
        const [ parentModelId, parentKey ] = Encoding.fromXrefKey(stream[QC.XParent]);
        
        streamData.push({
            id: stream[QC.Key],
            name: stream[QC.OName] ?? stream[QC.Name],
            parent: {
                modelId: parentModelId,
                key: parentKey
            }
        });
    }
    // STEP 6 - build map of model to element key
    const modelKeys = new Map();

    for (const item of streamData) {
        const modelId = item.parent.modelId;

        if (!modelKeys.has(modelId)) {
            modelKeys.set(modelId, []);
        }
        modelKeys.get(modelId).push(item.parent.key);
    }
    // STEP 6 - get element details
    for (const [ modelId, elementKeys] of modelKeys) {
        const elements = await client.getElements(modelId, elementKeys);

        for (const element of elements) {
            const fullKey = Encoding.toFullKey(element[QC.Key], false);
            const item = streamData.find(i => i.parent.modelId === modelId && i.parent.key === fullKey);

            if (item) {
                item.parent.name = element[QC.OName] ?? element[QC.Name];
            }
        }
    }
    // STEP 7 - print results (stream name - parent name)
    for (const item of streamData) {
        console.log(`${item.name}: (${item.parent.name})`);
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

