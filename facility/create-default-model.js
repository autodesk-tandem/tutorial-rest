/*
    This example demonstrates how to create default model for the facility. Default model is used to store elements which are not part of original model (i.e. streams).
    
    It uses 2-legged authentication - this requires that application is added to facility as service (Manage permission is needed).
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel, getMainModel } from './../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    // note that data:write scope is required
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility and check if default model exists
    const facilityId = FACILITY_URN;
    let facility = await client.getFacility(facilityId);
    let defaultModel = getDefaultModel(facilityId, facility);

    if (defaultModel) {
        console.warn(`Default model already exists`);
        return;
    }
    // STEP 3 - get main model and its data
    const mainModel = getMainModel(facility);
        
    if (!mainModel) {
        throw new Error('Unable to find main model');
    }
    const modelData = await client.getModel(mainModel.modelId);

    const worldBBox = modelData['world bounding box'];
    const distanceUnit = modelData['distance unit'];
    const customValues = modelData['custom values'];
    const georeference = modelData['georeference'];
    // STEP 4 - create inputs for default model
    const modelInputs = {
        version: 1,
        stats: {
            num_fragments: 0,
            num_geoms: 0,
            num_materials: 0,
            num_polys: 0,
            num_textures: 0
        }
    };

    if (worldBBox) {
        modelInputs['world bounding box'] = worldBBox;
    }
    if (distanceUnit) {
        modelInputs['distance unit'] = distanceUnit;
    }
    if (customValues) {
        modelInputs['custom values'] = customValues;
    }
    if (georeference) {
        modelInputs['georeference'] = georeference;
    }
    // STEP 5 - create default model and print its id
    const defaultModelResult = await client.createDefaultModel(facilityId);
    
    console.log(`default model id: ${defaultModelResult.modelId}`);
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
