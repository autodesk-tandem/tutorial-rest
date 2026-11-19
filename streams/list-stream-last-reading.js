/*
    This example demonstrates how to get last stream reading. This is similar to list-stream-data.js
    but uses different API call which is more efficient for getting last stream values.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { AttributeType, ColumnFamilies, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

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
    // STEP 3 - get schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    const propDefsById = new Map(
        schema.attributes.filter(attr => attr.fam === ColumnFamilies.DtProperties)
        .map(attr => [attr.id, attr]));
    // STEP 4 - prepare property value maps for string attributes
    const propValueMap = new Map();

    for (const [propId, propDef] of propDefsById.entries()) {
        if (propDef.dataType === AttributeType.String) {
            propValueMap.set(propId, new Map(
                Object.entries(propDef.allowedValues?.map || {})
                    .map(([name, value]) => [value, name])
            ));
        }
    }
    // STEP 5 - get streams
    const streams = await client.getStreams(defaultModel.modelId);
    // STEP 6 - get last readings for each stream
    const streamById = new Map(streams.map(stream => [stream[QC.Key], stream]));
    const keys = Array.from(streamById.keys());
    const data = await client.getStreamLastReading(defaultModel.modelId, keys);

    for (const [key, readings] of Object.entries(data)) {
        // STEP 7 - read stream name
        const stream = streamById.get(key);

        if (!stream) {
            console.warn(`Unable to find stream for key: ${key}`);
            continue;
        }
        const name = stream[QC.OName] ?? stream[QC.Name];

        console.log(`${name}`);
        // STEP 8 - print stream values
        for (const [propId, values] of Object.entries(readings)) {
            const propDef = propDefsById.get(propId);

            if (!propDef) {
                console.warn(`Unable to find property definition: ${propId}`);
                continue;
            }
            console.log(`  ${propDef.name} (${propId})`);
            // STEP 9 - print values
            for (const [ts, value] of Object.entries(values)) {
                const date = new Date(parseInt(ts));
                
                if (propDef.dataType === AttributeType.String) {
                    // STEP 10 - check string value from map created above.
                    const name = propValueMap.get(propId)?.get(value) ?? value;

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

