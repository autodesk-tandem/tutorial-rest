/*
    This example demonstrates how to get last stream reading. This is similar to list-stream-data.js
    but uses different API call which is more efficient for getting last stream values.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { AttributeType, ColumnFamilies, QC } from '../common/constants.js';
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

    // STEP 3 - get schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    // STEP 5 - get last readings for each stream
    const keys = streams.map(stream => stream[QC.Key]);
    const data = await client.getStreamLastReading(defaultModel.modelId, keys);

    for (const key in data) {
        // STEP 6 - read stream name
        const stream = streams.find(s => Encoding.toFullKey(s[QC.Key], true) === key);
        let name = stream[QC.OName];

        name ??= stream[QC.Name];
        console.log(`${name}`);
        // STEP 7 - print stream values
        const item = data[key];

        for (const propId in item) {
            const propDef = schema.attributes.find(p => p.fam === ColumnFamilies.DtProperties && p.id === propId);
            // STEP 8 - create map for discrete values
            const valueMap = new Map();

            if (propDef && propDef.dataType === AttributeType.String) {
                for (const name in propDef.allowedValues.map) {
                    const value = propDef.allowedValues.map[name];

                    valueMap.set(value, name);
                }
            }
            const values = item[propId];
            
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

