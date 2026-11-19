/*
    This example demonstrates how to create generic asset (w/o geometry).
    The facility is using template based on Tandem categories and new asset is Mechanical Equipment.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies,
    ColumnNames,
    ElementFlags,
    MutateActions } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel, matchClassification } from '../common/utils.js';
    

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLINET_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const TANDEM_CATEGORY = 'M.Eq'; // Mechanical Equipment
const CATEGORY = 1140; // Mechanical Equipment

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
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 3 - get facility template
    const template = await client.getFacilityTemplate(facilityId);
    const classification = template.classification.rows.find(c => c[0] === TANDEM_CATEGORY);

    if (!classification) {
        throw new Error(`Classification ${TANDEM_CATEGORY} not found`);
    }
    const pset = template.psets.find(p => p.name === template.name);
    // STEP 4 - get suitable parameters for classification
    const classParameters = pset?.parameters.filter(p => p.applicationFilters?.tandemCategory?.some(c => matchClassification(classification[0], c)));

    if (!classParameters || classParameters.length === 0) {
        throw new Error(`No suitable parameters for provided classification: ${TANDEM_CATEGORY}`);
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
                ColumnNames.TandemCategory,
                classification[0]
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.CategoryId,
                CATEGORY
            ]
        ],
        desc: 'Create asset'
    };
    // STEP 6 - add asset properties based on mapping below (property name -> value)
    const assetProperties = {
        'Flow Rate': 2500,
        'Function': ['Ventilation'], // tags
        'Pressure': 140
    };

    for (const [item, value] of Object.entries(assetProperties)) {
        const classParameter = classParameters.find(p => p.name === item);

        if (!classParameter) {
            console.warn(`Parameter ${item} not found in template`);
            continue;
        }
        const param = schema.attributes.find(a => 
            a.fam === ColumnFamilies.DtProperties &&
            a.name === classParameter.name &&
            a.category == classParameter.category);

        if (!param) {
            console.warn(`Parameter ${item} not found in schema`);
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
