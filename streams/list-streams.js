/*
    This example demonstrates how to get streams from given facility and get stream details (name, parent).
    
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

    // STEP 3 - get streams and their parents
    const streams = await client.getStreams(defaultModel.modelId);
    const modelStreamMap = new Map();

    for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        // host is stored as parent
        const parentXref = stream[QC.XParent];

        if (!parentXref) {
            continue;
        }
        // decode xref key of the host
        const [ modelId, key ] = Encoding.fromXrefKey(parentXref);
        let items = modelStreamMap.get(modelId)

        if (!items) {
            items = [];
            modelStreamMap.set(modelId, items);
        }
        items.push({
            key: Encoding.toShortKey(key),
            streamIndex: i
        });
    }
    // STEP 5 - print name of stream + name of parent
    // note we use batch query to get properties of multiple elements
    // in one call rather than query server for each element
    for (const [ modelId, items] of modelStreamMap.entries()) {
        const keys = items.map(n => n.key);
        const elementData = await client.getElements(modelId, keys);
        
        for (const item of items) {
            const stream = streams[item.streamIndex];
            const name = stream[QC.OName] ?? stream[QC.Name];
            const parentData = elementData.find(i => i[QC.Key] === item.key);

            if (!parentData) {
                continue;
            }
            const parentName = parentData[QC.OName] ?? parentData[QC.Name];

            console.log(`${name}:${parentName}`);
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

