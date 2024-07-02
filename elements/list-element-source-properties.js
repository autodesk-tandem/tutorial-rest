/*
    This example demonstrates how to get read source properties (i.e. from Revit). Those properties are available as Source family.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, QC } from '../common/utils.js';

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

    // STEP 3 - iterate through facility models and process elements
    for (const link of facility.links) {
        const schema = await client.getModelSchema(link.modelId);
        // STEP 4 - find property
        const propDef = schema.attributes.find(p => p.fam === ColumnFamilies.Source && p.category === 'Identity Data' && p.name === 'Type Name');

        if (!propDef) {
            continue;
        }
        // STEP 5 - get elements and print out property value
        const elements = await client.getElements(link.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.Source]);

        for (const element of elements) {
            const prop = element[propDef.id];

            if (!prop) {
                continue;
            }
           let name = element[QC.OName];

            name ??= element[QC.Name];
            console.log(`${name}: ${element[QC.Key]}`);
            console.log(`  ${prop}`);
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
