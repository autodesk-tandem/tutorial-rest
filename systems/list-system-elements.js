/*
    This example demonstrates how to get systems from facility and locate associated elements.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import {
    ColumnFamilies,
    ElementFlags,
    QC } from '../common/constants.js';
import {
    Encoding,
    getDefaultModel,
    systemClassToList
} from '../common/utils.js';

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
    const systemMap = new Map();

    for (const system of systems) {
        const key = Encoding.toFullKey(system[QC.Key], true);
        const name = system[QC.OName] ?? system[QC.Name];
        const parent = system[QC.Parent];

        // skip subsystems
        if (parent) {
            continue;
        }
        // encode element key to system id
        const systemId = Encoding.toSystemId(key);
        const filter = system[QC.OSystemClass] ?? system[QC.SystemClass];

        systemMap.set(systemId, {
            name,
            key,
            filter
        });
    }
    // STEP 4 - iterate through model elements and store their relationship to system
    const systemElementsMap = new Map();
    const systemClassMap = new Map();

    for (const link of facility.links) {
        const elements = await client.getElements(link.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.Systems ]);
    
        for (const element of elements) {
            const elementFlags = element[QC.ElementFlags];

             // skip deleted elements and systems
            if (elementFlags === ElementFlags.Deleted || elementFlags === ElementFlags.System) {
                continue;
            }
            const key = element[QC.Key];
            // check if element has system class assigned
            const elementClass = element[QC.OSystemClass] ?? element[QC.SystemClass];

            if (!elementClass) {
                continue;
            }
            const elementClassNames = systemClassToList(elementClass);

            for (const item in element) {
                // need to handle both fam:col and fam:!col formats
                const [, family, systemId] = item.match(/^([^:]+):!?(.+)$/) ?? [];

                if (family === ColumnFamilies.Systems) {
                    const system = systemMap.get(systemId);

                    if (!system) {
                        continue;
                    }
                    const filter = system.filter;
                    let classNames = systemClassMap.get(filter);

                    if (!classNames) {
                        classNames = systemClassToList(filter);
                        systemClassMap.set(filter, classNames);
                    }
                    // if system has filter, then check that element matches it
                    const matches = elementClassNames.some(name => classNames.includes(name));

                    if (matches) {
                        // use set to handle possible duplicates
                        let elementList = systemElementsMap.get(systemId);

                        if (!elementList) {
                            elementList = new Set();
                            systemElementsMap.set(systemId, elementList);
                        }
                        elementList.add(key);
                    }
                }
            }
        }
    }
    // STEP 5 - print out system names and number of associated elements
    for (const [systemId, system] of systemMap.entries()) {
        const systemElements = systemElementsMap.get(systemId);

        if (systemElements?.size > 0) {
            console.log(`${system.name} (${systemId})`);
            console.log(`  Element count: ${systemElements.size}`);
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
