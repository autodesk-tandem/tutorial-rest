/*
    This example demonstrates how to update properties of an asset.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, MutateActions, QC } from '../common/constants.js';

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
    // the key is asset id (stored in Device ID property - see above)
    const assetPropertyMap = {
        'P001' : {
            'Controller Type': 'Centrifugal',
            'Flow Rate': 2300,
            'Frequency': 60,
            'Temperature': 105,
            'Working Pressure': 175
        }
    };

    // STEP 3 - iterate through facility models
    for (const link of facility.links) {
        // STEP 4 - collect property names
        const propertyNames = new Set();
        
        for (const assetId in assetPropertyMap) {
            const props = assetPropertyMap[assetId];

            for (const propName in props) {
                propertyNames.add(propName);
            }
        }
        // STEP 5 - create map between name and id
        const schema = await client.getModelSchema(link.modelId);
        const propertyMap = {};
        let idProp; // use to store property wich is used to identify asset (i.e. Device ID by default)

        for (const prop of schema.attributes) {
            // we would like to check only custom properties
            if (prop.fam === ColumnFamilies.DtProperties && propertyNames.has(prop.name)) {
                propertyMap[prop.name] = prop;
            }
            // check for our key property
            if (prop.fam === ColumnFamilies.DtProperties && prop.name === ASSET_ID_PROPERTY) {
                idProp = prop;
            }            
        }
        if (!idProp) {
            continue;
        }
        // STEP 6 - iterate through assets and collect changes
        const assets = await client.getTaggedAssets(link.modelId);
        const keys = [];
        const mutations = [];
        
        for (const asset of assets) {
            const deviceId = asset[idProp.id];

            if (!deviceId) {
                continue;
            }
            console.log(`${asset[QC.Name]}:${deviceId}`);
            // check for new property data from map above
            const propertyData = assetPropertyMap[deviceId];

            if (!propertyData) {
                continue;
            }
            for (const prop in propertyData) {
                const newValue = propertyData[prop];
                const propDef = propertyMap[prop];

                if (!propDef) {
                    continue;
                }
                const currentValue = asset[propDef.id];
                
                // we apply change only if there is difference
                if (currentValue === newValue) {
                    continue;
                }
                console.log(`  ${propDef.name}:${newValue}`);
                keys.push(asset[QC.Key]);
                mutations.push([
                    MutateActions.Insert,
                    propDef.fam,
                    propDef.col,
                    newValue
                ]);

            }
        }
        if (keys.length === 0) {
            continue;
        }
        await client.mutateElements(link.modelId, keys, mutations, "Update asset properties");

        console.log(`Updated properties: ${keys.length}`);
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
