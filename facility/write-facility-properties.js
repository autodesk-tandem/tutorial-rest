/*
    This example demonstrates how to update properties of the facility.
    
    It uses 2-legged authentication - this requires that application is added to the account as service.
*/
import { createToken } from '../common/auth.js';
import { ElementFlags, MutateActions, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

const PROPERTY_NAME = 'My custom property';
const PROPERTY_VALUE = 1000;

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });
    // STEP 2 - get facility and default model. Note for existing facilities default model may not exist - in this case it
    // needs to be created explicitly by using POST defaultmodel endpoint.
    const facility = await client.getFacility(FACILITY_URN);
    const defaultModel = getDefaultModel(FACILITY_URN, facility);

    if (!defaultModel) {
        throw new Error('Default model is not found');
    }
    // STEP 3 - get model schema
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - get elements from the model, find root element. Note root element is created automatically with default model
    const elements = await client.getElements(defaultModel.modelId);
    const rootElement = elements.find(e => e[QC.ElementFlags] === ElementFlags.DocumentRoot);

    if (!rootElement) {
        throw new Error('Root element is not found');
    }
    // STEP 5 - add predefined property to the root element
    const propDef = schema.attributes.find(a => a.name === PROPERTY_NAME);

    if (!propDef) {
        throw new Error(`Property "${PROPERTY_NAME}" not found in schema`);
    }
    const muts = [
        [
            MutateActions.InsertIfDifferent,
            propDef.fam,
            propDef.col,
            PROPERTY_VALUE
        ]
    ];
    await client.mutateElements(defaultModel.modelId, [rootElement[QC.Key]], muts, 'Update facility properties');
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
