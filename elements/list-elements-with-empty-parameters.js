/*
    This example demonstrates how to locate classified assets with empty parameters.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel,matchClassification } from '../common/utils.js';

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
    // STEP 3 - get default model
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 4 - get schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 5 - get assets and iterate through them
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    let assetCount = 0;

    for (const asset of assets) {
        const name = asset[QC.OName] ?? asset[QC.Name];
        // STEP 6 - find parameters related to classification or Tandem category
        const classification = asset[QC.OClassification] ?? asset[QC.Classification];
        const category = asset[QC.OTandemCategory] ?? asset[QC.TandemCategory];
        let classParameters;

        if (classification) {
            classParameters = pset?.parameters.filter(p => p.applicationFilters?.userClass?.some(c => matchClassification(classification, c)));
        } else if (category) {
            classParameters = pset?.parameters.filter(p => p.applicationFilters?.tandemCategory?.some(c => matchClassification(category, c)));
        }
        if (!classParameters || classParameters.length === 0) {
            continue;
        }
        // STEP 7 - check parameters with empty value
        let parameterCount = 0;

        console.log(`Processing asset: ${name}`);
        for (const classParameter of classParameters) {
            const parameterDef = schema.attributes.find(a => a.category === classParameter.category && a.name === classParameter.name);

            if (!parameterDef) {
                continue;
            }
            // parameter can be either missing or be empty string - depends on type
            if (asset[parameterDef.id] === undefined || asset[parameterDef.id] === '') {
                console.log(`  Parameter with empty value: ${parameterDef.category}.${parameterDef.name}`);
                parameterCount++;
            }
        }
        if (parameterCount > 0) {
            assetCount++;
        }
    }
    // STEP 8 - print out total number of assets with empty parameters
    console.log(`Total number of assets with empty parameters: ${assetCount}`);
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
