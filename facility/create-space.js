/*
    This example demonstrates how to create logical space.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies,
    ColumnNames,
    ElementFlags,
    getDefaultModel,
    MutateActions } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_ID';

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
    // STEP 3 - get default model
    const defaultModel = getDefaultModel(facilityId, facility);
    // STEP 4 - create logical space with minimal properties
    const inputs = {
        muts: [
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.Name,
                'My Space'
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.ElementFlags,
                ElementFlags.Room
            ],
            [
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.CategoryId,
                160
            ]
        ],
        desc: 'Create space'
    };

    const result = await client.createElement(defaultModel.modelId, inputs);

    console.log(`New space created: ${result.key}`);
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
