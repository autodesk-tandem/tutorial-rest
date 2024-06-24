/*
    This example demonstrates how to find parent element (= host) of stream.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, Encoding, QC, getDefaultModel } from '../common/utils.js';

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
    const streams = await client.getStreams(defaultModel.modelId, [ ColumnFamilies.Standard, ColumnFamilies.Xrefs ]);
    const streamData = [];

    // STEP 4 - get parent data
    for (const stream of streams) {
        if (!stream[QC.XParent]) {
            console.log(`Stream ${stream[QC.Name]} has no parent`);
            continue;
        }
        const [ parentModelId, parentKey ] = Encoding.fromXrefKey(stream[QC.XParent]);
        
        streamData.push({
            id: stream[QC.Key],
            name: stream[QC.Name],
            parent: {
                modelId: parentModelId,
                key: parentKey
            }
        });
    }
    // STEP 5 - build map of model to element key
    const modelKeys = {};

    for (const item of streamData) {
        const modelId = item.parent.modelId;
        let elementKeys = modelKeys[modelId];

        if (!elementKeys) {
            elementKeys = [];
            modelKeys[modelId] = elementKeys;
        }
        elementKeys.push(item.parent.key);
    }
    // STEP 6 - get element details
    for (const modelId in modelKeys) {
        const elementKeys = modelKeys[modelId];
        const elements = await client.getElements(modelId, elementKeys);

        for (const element of elements) {
            const fullKey = Encoding.toFullKey(element[QC.Key], false);
            const item = streamData.find(i => i.parent.modelId === modelId && i.parent.key === fullKey);

            if (item) {
                item.parent.name = element[QC.Name];
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

