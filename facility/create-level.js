/*
    This example demonstrates how to create level - this is useful for No BIM scenarios.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies,
    ColumnNames,
    ElementFlags,
    MutateActions,
    QC,
    TC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';;

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const LEVEL_NAME = '02 SECOND - FINISH FLOOR';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    }, 'US');

    // STEP 2 - get facility
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    // STEP 3 - get default model
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    // STEP 4 - create level with minimal properties
    const inputs = {
        muts: [
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.Name,
                LEVEL_NAME
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.ElementFlags,
                ElementFlags.Location
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.TandemCategory,
                TC.Levels,
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.CategoryId,
                240 // Revit level category ID
            ]
        ],
        desc: 'Create level'
    };
    const result = await client.createElement(defaultModel.modelId, inputs);

    console.log(`New level created: ${result.key}`);
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
