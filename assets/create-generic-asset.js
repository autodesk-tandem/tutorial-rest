/*
    This example demonstrates how to create generic asset (w/o geometry).
    The facility is using REC Sample template and new asset is Lighting Equipment.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies,
    ColumnNames,
    ElementFlags,
    MutateActions } from '../common/constants.js';
import { getDefaultModel, matchClassification } from '../common/utils.js';
    

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLINET_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const CLASSIFICATION = 'Lighting Equipment';
const ASSEMBLY_CODE = 'D5040.50'; // Lighting Fixtures
const CATEGORY = 1120; // Lighting Fixtures

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Facility does not have default model');
    }
    // STEP 3 - get facility template
    const template = await client.getFacilityTemplate(facilityId);
    const classification = template.classification.rows.find(c => c[1] === CLASSIFICATION);

    if (!classification) {
        throw new Error(`Classification ${CLASSIFICATION} not found`);
    }
    const pset = template.psets.find(p => p.name === template.name);
    // STEP 4 - get suitable parameters for classification
    const classParameters = pset?.parameters.filter(p => p.applicationFilters.userClass.some(c => matchClassification(classification[0], c)));

    if (!classParameters) {
        throw new Error(`No suitable parameters for provided classification: ${CLASSIFICATION}`);
    }
    const schema = await client.getModelSchema(defaultModel.modelId);

    // STEP 5 - collect inputs for new asset
    const inputs = {
        muts: [
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.Name,
                'Test Asset'
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.ElementFlags,
                ElementFlags.GenericAsset
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.Classification,
                classification[0]
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.CategoryId,
                CATEGORY
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.UniformatClass,
                ASSEMBLY_CODE
            ]
        ],
        desc: 'Create asset'
    };
    // STEP 6 - add asset properties based on ma below (property name -> value)
    const assetProperties = {
        'Asset Tag': '12345',
        'Model Number': 'ABC',
        'IP Address': '10.0.0.0',
        'Serial Number': '12345'
    };

    for (const item in assetProperties) {
        const value = assetProperties[item];
        const classParameter = classParameters.find(p => p.name === item);
        const param = schema.attributes.find(a => a.name === classParameter.name && a.category == classParameter.category);

        if (!param) {
            continue;
        }
        inputs.muts.push([
            MutateActions.Insert,
            param.fam,
            param.col,
            value
        ]);
    }
    // STEP 7 - create new asset. Note that generic asset should be added to default model only.
    const result = await client.createElement(defaultModel.modelId, inputs);

    console.log(`New asset created: ${result.key}`);
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
