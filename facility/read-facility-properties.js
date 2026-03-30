/*
    This example demonstrates how to list properties of the facility.
    
    It uses 2-legged authentication - this requires that application is added to the account as service. The application also
    needs to be whitelisted in ACC/Docs.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, ElementFlags, QC } from '../common/constants.js';
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
    const facility = await client.getFacility(FACILITY_URN);
    const defaultModel = getDefaultModel(FACILITY_URN, facility);

    if (!defaultModel) {
        throw new Error('Default model is not found');
    }
    // STEP 3 - get model schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - get elements from the model, find root element
    const elements = await client.getElements(defaultModel.modelId, undefined,
        [ ColumnFamilies.Standard, ColumnFamilies.DtProperties]);
    const rootElement = elements.find(e => e[QC.ElementFlags] === ElementFlags.DocumentRoot);

    if (!rootElement) {
        throw new Error('Root element is not found');
    }
    // STEP 5 - print properties of the root elemen
    console.log(`Facility properties: ${count}`);
    let count = 0;

    for (const [id, value] of Object.entries(rootElement)) {
        if (!id.startsWith(`${ColumnFamilies.DtProperties}:`)) {
            continue;
        }
        const propDef = schema.attributes.find(a => a.id === id);

        if (!propDef) {
            continue;
        }
        console.log(`  ${propDef.name}: ${value}`);
        count++;
    }
    console.log(`Total properties: ${count}`);
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
