/*
    This example demonstrates how to get tag properties for assets and print their values. Tag properties allow adding
    multiple values to the element.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { AttributeType, QC } from '../common/constants.js';

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
        // STEP 4 - read property definitions for tag properties - they are of type StringList
        const propDefs = schema.attributes.filter(a => a.dataType === AttributeType.StringList);

        if (propDefs.length === 0) {
            continue;
        }
        const propIds = propDefs.map(p => p.id);
        const assets = await client.getTaggedAssets(link.modelId);

        for (const asset of assets) {
            // STEP 5 - get tag properties for each asset
            const props = propIds
                .filter(propId => asset[propId] !== undefined); // remove properties without values

            if (props.length === 0) {
                continue;
            }
            // first check for name override, if empty then use default name
            const name = asset[QC.OName] ?? asset[QC.Name];

            console.log(`${name}: ${asset[QC.Key]}`);
            // STEP 5 - iterate through tag properties and print out property name & value
            for (const propId of props) {
                const propDef = schema.attributes.find(p => p.id === propId);

                if (!propDef) {
                    continue;
                }
                const values = asset[propId];
                
                console.log(`  ${propDef.category}.${propDef.name}: ${values.join(',')}`);
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
