/*
    This example demonstrates how to update properties of an asset.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, MutateActions, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { getDefaultModel } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';
const ASSET_ID_PROPERTY = 'Device ID';

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
    // the map below contains property values for assets
    // the key is asset id (stored in Asset ID property - see above)
    const assetPropertyMap = {
        'AHU001' : {
            'Flow Rate': 2300, // number
            'Function': ['Ventilation'], // tags
            'Status': 'AVAILABLE' // string
        }
    };
    // STEP 3 - get default model and its schema
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    const schema = await client.getModelSchema(defaultModel.modelId);
    // STEP 4 - create lookup map
    const propByName = schema.attributes.reduce((map, attr) => {
        if (attr.fam === ColumnFamilies.DtProperties) {
            map[attr.name] = attr;
        }
        return map;
    }, {});
    // STEP 5 - get property definition for asset ID property
    const propDef = propByName[ASSET_ID_PROPERTY];

    if (!propDef) {
        throw new Error(`Property definition for ${ASSET_ID_PROPERTY} not found`);
    }
    // STEP 6 - get tagged assets
    const assets = await client.getTaggedAssets(defaultModel.modelId);
    const keys = [];
    const mutations = [];

    // STEP 7 - iterate through assets
    for (const asset of assets) {
        // STEP 8 - get asset tag and corresponding properties from the map
        const assetTag = asset[propDef.id];
        const props = assetPropertyMap[assetTag];

        if (!props) {
            continue;
        }
        // STEP 9 - iterate through properties for the asset
        for (const [propName, propValue] of Object.entries(props)) {
            const prop = propByName[propName];

            if (!prop) {
                continue;
            }
            const currentValue = asset[prop.id];

            if (currentValue === propValue) {
                continue;
            }
            console.log(`  ${prop.name}:${propValue}`);
            keys.push(asset[QC.Key]);
            mutations.push([
                MutateActions.Insert,
                prop.fam,
                prop.col,
                propValue
            ]);
        }
    }
    if (keys.length === 0) {
        return;
    }
    // STEP 10 - update asset properties in the model
    await client.mutateElements(defaultModel.modelId, keys, mutations, "Update asset properties");
    console.log(`Updated properties: ${keys.length}`);
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
