/*
    This example demonstrates how to list history of asset changes.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, HC, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

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
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    const schema = await client.getModelSchema(defaultModel.modelId);
    const propById = schema.attributes.reduce((acc, attr) => {
        acc[attr.id] = attr;
        return acc;
    }, {});
    const assets = await client.getTaggedAssets(defaultModel.modelId, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties ], true);
    const assetsKeyMap = new Map(assets.map(asset => [asset[QC.Key], asset]));
    const modelHistory = await client.getModelHistoryBetweenDates(defaultModel.modelId, 1, Date.now() * 1000, true);

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
            // note - when querying history we get value as array [value, timestamp]
            // so we need to destructure it to get the actual name value
            const [name] = asset[QC.OName] ?? asset[QC.Name];

            console.log(`  ${name}`);
            // STEP 6 - iterate through properties of asset and find those that changed at this timestamp
            // when history is requested, each property contains list of values and timestamps
            for (const [ propId, propValues] of Object.entries(asset)) {
                const propDef = propById[propId];

                if (!propDef) {
                    continue;
                }
                if (!Array.isArray(propValues)) {
                    continue;
                }
                const [value, tsChange] = propValues;

                // skip if this property change is at different timestamp
                if (tsChange !== ts) {
                    continue;
                }
                // STEP 7 - print out name and value of changed property
                console.log(`    ${propDef.name}: ${value}`);
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
