/*
    This example demonstrates how to get systems from facility and locate associated elements.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, Encoding, QC, getDefaultModel } from '../common/utils.js';

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

    // STEP 3 - iterate through systems and collect their data (id => { name, key })
    const defaultModel = getDefaultModel(facilityId, facility);
    const systems = await client.getSystems(defaultModel.modelId);
    const systemMap = {};

    for (const system of systems) {
        let name = system[QC.OName];

        if (!name) {
            name = system[QC.Name];
        }
        // encode element key to system id
        const key = system[QC.Key];
        const systemId = Encoding.toSystemId(key);

        systemMap[systemId] = {
            name,
            key
        };
    }
    // STEP 4 - iterate through model elements and store their relationship to system
    // in dictionary (id => { model, key, name })
    const systemElementsMap = {};

    for (const link of facility.links) {
        const elements = await client.getElements(link.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.Systems ]);
    
        for (const element of elements) {
            for (const item in element) {
                if (item.startsWith(`${ColumnFamilies.Systems}:`)) {
                    const systemId = item.replace(`${ColumnFamilies.Systems}:`, '');
                    let elementList = systemElementsMap[systemId];

                    if (!elementList) {
                        elementList = [];
                        systemElementsMap[systemId] = elementList;
                    }
                    elementList.push({
                        model: link.modelId,
                        key: element[QC.Key],
                        name: element[QC.Name]
                    });
                }
            }
        }
    }
    // STEP 5 - print out system names and associated elements
    for (const systemId in systemMap) {
        const system = systemMap[systemId];
        const systemElements = systemElementsMap[systemId];

        if (!systemElements) {
            continue;
        }
        console.log(`${system.name} (${systemElements.length})`);
        for (const element of systemElements) {
            console.log(`  ${element.name}`);
        }
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
