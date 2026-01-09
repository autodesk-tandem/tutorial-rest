/*
    This example demonstrates how to get streams from given facility and get their data.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { AttributeType, ColumnFamilies, QC } from '../common/constants.js';
import { getDefaultModel } from '../common/utils.js';

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

    // STEP 3 - get schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - calculate dates (from, to)
    const now = new Date();
    const to = now.getTime();
    const from = new Date(now.getTime() - OFFSET_DAYS * 24 * 60 * 60 * 1000).getTime();
    // STEP 5 - get streams
    const streams = await client.getStreams(defaultModel.modelId);

    for (const stream of streams) {
        // STEP 4 - get stream data for last NN days and print their values
        const streamKey = stream[QC.Key];
        const name = stream[QC.OName] ?? stream[QC.Name];

        console.log(`${name}`);
        const data = await client.getStreamData(defaultModel.modelId, streamKey, from, to);

        for (const item in data) {
            const propDef = schema.attributes.find(p => p.fam === ColumnFamilies.DtProperties && p.id === item);

            if (!propDef) {
                console.warn(`Unable to find property definition: ${item}`);
            }
            const valueMap = new Map();

            if (propDef && propDef.dataType === AttributeType.String) {
                for (const [name, value] of Object.entries(propDef.allowedValues.map)) {
                    valueMap.set(value, name);
                }
            }
            console.log(`  ${propDef?.name} (${item})`);
            const values = data[item];

            for (const ts in values) {
                const date = new Date(parseInt(ts));
                const value = values[ts];
                
                if (propDef?.dataType === AttributeType.String) {
                    const name = valueMap.get(value);

                    console.log(`    [${date.toLocaleString()}]: ${name}`);
                } else {
                    console.log(`    [${date.toLocaleString()}]: ${value}`);
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

