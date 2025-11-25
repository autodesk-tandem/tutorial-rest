/*
    This example demonstrates how to list history of asset changes.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, HC, QC } from '../common/constants.js';

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

    // STEP 3 - iterate through facility models
    for (const link of facility.links) {
        let label = link.label;

        if (label.length === 0) {
            label = 'Default';
        }
        console.log(`Model: ${label}`);
        // STEP 4 - get schema, assets and history
        const schema = await client.getModelSchema(link.modelId);
        const assets = await client.getTaggedAssets(link.modelId, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties ], true);
        const assetsKeyMap = new Map();
        
        for (const asset of assets) {
            const key = asset[QC.Key];

            assetsKeyMap.set(key, asset);
        }
        const modelHistory = await client.getModelHistoryBetweenDates(link.modelId, 1, Date.now() * 1000, true, false);

        // STEP 5 - iterate through history and print out details of changed assets
        for (const historyEntry of modelHistory) {
            const ts = historyEntry[HC.Timestamp];
            const keys = historyEntry[HC.Keys] || [];
            const updatedAssets = keys.map(key => assetsKeyMap.get(key)).filter(asset => asset !== undefined);

            if (updatedAssets.length === 0) {
                continue;
            }
            console.log(`${new Date(Number(ts) / 1000).toISOString()} - ${historyEntry[HC.Description]} (${historyEntry[HC.Username] || ''})`);
            for (const asset of updatedAssets) {
                const name = asset[QC.OName] ?? asset[QC.Name];

                console.log(`  ${name[0]}`);
                // STEP 6 - iterate through properties of asset and find those that changed at this timestamp
                // when history is requested, each property contains list of values and timestamps
                for (const [ propId, propValues] of Object.entries(asset)) {
                    const propDef = schema.attributes.find(a => a.id === propId);

                    if (!propDef) {
                        continue;
                    }
                    if (!Array.isArray(propValues)) {
                        continue;
                    }
                    for (let i = 0; i < propValues.length / 2; i++) {
                        const tsChange = propValues[i + 1];

                        // skip if this property change is at different timestamp
                        if (tsChange !== ts) {
                            continue;
                        }
                        // STEP 7 - print out name and value of changed property
                        const value = propValues[i];
                        
                        console.log(`    ${propDef.name}: ${value}`);
                    }
                }
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
