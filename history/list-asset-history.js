/*
    This example demonstrates how to get asset history.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.

    NOTE - This example uses API which is NOT DOCUMENTED at the moment:
        POST https://developer.api.autodesk.com/tandem/v1/modeldata/:modelId/history
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, QC } from '../common/constants.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);

    // STEP 3 - iterate through facility models and collect tagged assets
    for (const link of facility.links) {
        const schema = await client.getModelSchema(link.modelId);
        const assets = await client.getTaggedAssets(link.modelId, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties ], true);

        if (assets.length === 0) {
            continue;
        }
        // STEP 4 - collect timestamps and get list of model changes
        const timestamps = getTimestamps(assets);
        const modelHistory = await client.getModelHistory(link.modelId, timestamps);

        // STEP 5 - iterate through assets and print their properties including timestamp and author of change
        for (const asset of assets) {
            console.log(`${asset[QC.Name][0]}`);
            console.log(`${asset[QC.Key]}`);
            for (const prop in asset) {
                const props = asset[prop];

                if (!Array.isArray(props)) {
                    continue;
                }
                const propDef = schema.attributes.find(a => a.id === prop);

                if (!propDef) {
                    continue;
                }
                console.log(`  ${propDef.category}:${propDef.name}`);
                
                for (let i = 0; i < props.length; i += 2) {
                    const value = props[i];
                    const ts = props[i + 1];
                    const tsDate = new Date(ts);
                    // find change details using timestamp
                    const modelHistoryItem = modelHistory.find(n => n.t === ts);

                    console.log(`    ${tsDate.toLocaleString()}:${value} ${modelHistoryItem ? modelHistoryItem.n : 'NA'}`);
                }
            }
        }
    }   
}

/**
 * Returns array of timestamp values.
 * 
 * @param {object[]} assets - list of inputs assets.
 * @returns {number[]}
 */
function getTimestamps(assets) {
    const timestamps = new Set();

    for (const asset of assets) {
        for (const prop in asset) {
            const props = asset[prop];

            if (Array.isArray(props)) {
                // timestamps are even items from array, i.e. [ 'val1', ts1, 'val2', ts2 ]
                for (let i = 0; i < props.length; i += 2) {
                    const ts = props[i + 1];

                    if (Number.isInteger(ts)) {
                        timestamps.add(ts);
                    }
                }
            }
        }
    }
    return [...timestamps];
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
