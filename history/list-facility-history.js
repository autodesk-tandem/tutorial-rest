/*
    This example demonstrates how to get history of elements within facility.
    
    It uses 2-legged authentication - this requires athat application is added to facility as service.

    NOTE - This example uses API which is NOT SUPPORTED at the moment:
        POST https://developer.api.autodesk.com/tandem/v1/modeldata/:modelId/history
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, QC } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const OFFSET_DAYS = 10;

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
    // STEP 3 - calculate dates for history
    const now = new Date();
    const to = now.getTime();
    const from = new Date(now.getTime() - OFFSET_DAYS * 24 * 60 * 60 * 1000).getTime();

    // STEP 4 - iterate through facility models
    for (const link of facility.links) {
        const schema = await client.getModelSchema(link.modelId);
        // STEP 5 - get history between dates
        const history = await client.getModelHistoryBetweenDates(link.modelId, from, to, true, false);
        // extract list of keys and related timestamp (k, t)
        const entries = history.flatMap((i) => i.k?.map((j) => ( { k: j, t: i.t })))
            .filter(n => n !== undefined);

        if (entries.length === 0) {
            continue;
        }
        console.log(`${link.label}`);
        // STEP 6 - get updated elements
        const keys = entries.map(e => e.k);
        const elements = await client.getElements(link.modelId, keys, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties ], true);

        // STEP 7 - iterate through elements and print out changes
        for (const element of elements) {
            console.log(`  ${element[QC.Name][0]}:${element[QC.Key]}`);
            // get list of timestamps
            const timestamps = entries.filter(i => i.k === element[QC.Key])
                .map(j => j.t)
                .sort();

            // iterate through properties and identify the ones which were changed
            // using timestamp
            for (const prop in element) {
                const props = element[prop];

                if (!Array.isArray(props)) {
                    continue;
                }
                const propDef = schema.attributes.find(a => a.id === prop);

                for (let i = 0; i < props.length; i += 2) {
                    const value = props[i];
                    const ts = props[i + 1];

                    if (!timestamps.includes(ts)) {
                        continue;
                    }
                    const tsDate = new Date(ts);
                    // find change details using timestamp
                    const historyItem = history.find(n => n.t === ts);

                    console.log(`    ${propDef.category}:${propDef.name}`);
                    console.log(`      ${tsDate.toLocaleString()}:${value} ${historyItem ? historyItem.n : 'NA'}`);
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
