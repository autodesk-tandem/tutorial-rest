/*
    This example demonstrates how to get systems from facility and locate associated elements.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { ColumnFamilies, ElementFlags, QC } from '../common/constants.js';
import { TandemClient } from '../common/tandemClient.js';
import { Encoding, getDefaultModel } from '../common/utils.js';

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

    // STEP 3 - iterate through systems and collect their data (id => { name, key, filter })
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error(`Default model doesn't exist`);
    }
    const systems = await client.getSystems(defaultModel.modelId);
    const systemMap = new Map();

    for (const system of systems) {
        const key = system[QC.Key];
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

    for (const link of facility.links) {
        const elements = await client.getElements(link.modelId, undefined, [ ColumnFamilies.Standard, ColumnFamilies.Systems ]);

        for (const element of elements) {
            const elementFlags = Encoding.getElementFlags(element[QC.Key]);

             // skip deleted elements and systems
            if (elementFlags === ElementFlags.Deleted || elementFlags === ElementFlags.System) {
                continue;
            }
            const xrefKey = Encoding.toXrefKey(link.modelId, element[QC.Key]);
            // get system related properties
            const systemPropKeys = Object.keys(element).filter(k => k.startsWith(`${ColumnFamilies.Systems}:`));

            for (const item of systemPropKeys) {
                // need to handle both fam:col and fam:!col formats
                const [, family, systemId] = item.match(/^([^:]+):!?(.+)$/) ?? [];
                const system = systemMap.get(systemId);

                if (!system) {
                    continue;
                }
                // use set to handle possible duplicates
                if (!systemElementsMap.has(systemId)) {
                    systemElementsMap.set(systemId, new Set());
                }
                systemElementsMap.get(systemId).add(xrefKey);
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
