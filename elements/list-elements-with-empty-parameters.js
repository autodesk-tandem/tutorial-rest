/*
    This example demonstrates how to locate classified elements with empty parameters.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, QC } from '../common/constants.js';
import { matchClassification } from '../common/utils.js';

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
    const template = await client.getFacilityTemplate(FACILITY_URN);
    const pset = template.psets.find(p => p.name === template.name);

    // STEP 3 - iterate through facility models and process elements
    let elementCount = 0;

    for (const link of facility.links) {
        // STEP 3 - get schema
        const schema = await client.getModelSchema(link.modelId);
        // STEP 4 - get elements and process one by one
        const elements = await client.getElements(link.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.DtProperties ]);
        
        for (const element of elements) {
            const name = element[QC.OName] ?? element[QC.Name];
            // STEP 5 - find parameters related to classification or Tandem category
            const classification = element[QC.OClassification] ?? element[QC.Classification];
            const category = element[QC.OTandemCategory] ?? element[QC.TandemCategory];
            let classParameters;

            if (classification) {
                classParameters = pset?.parameters.filter(p => p.applicationFilters?.userClass?.some(c => matchClassification(classification, c)));
            } else if (category) {
                classParameters = pset?.parameters.filter(p => p.applicationFilters?.tandemCategory?.some(c => matchClassification(category, c)));
            }
            if (!classParameters || classParameters.length === 0) {
                continue;
            }
            // STEP 6 - check parameters with empty value
            let parameterCount = 0;

            console.log(`Processing element: ${name}`);
            for (const classParameter of classParameters) {
                const parameterDef = schema.attributes.find(a => a.category === classParameter.category && a.name === classParameter.name);

                if (!parameterDef) {
                    continue;
                }
                // parameter can be either missing or be empty string - depends on type
                if (element[parameterDef.id] === undefined || element[parameterDef.id] === '') {
                    console.log(`  Empty value: ${parameterDef.category}.${parameterDef.name}`);
                    parameterCount++;
                }
            }
            if (parameterCount > 0) {
                elementCount++;
            }
        }
    }
    // STEP 7 - print out total number of elements with empty parameters
    console.log(`Total number of elements with empty parameters: ${elementCount}`);
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
