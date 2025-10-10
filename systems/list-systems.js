/*
    This example demonstrates how to get systems from facility and print their names.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { QC } from '../common/constants.js';
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
    const facilityTemplate = await client.getFacilityTemplate(facilityId);
    // STEP 3 - get default model
    const defaultModel = getDefaultModel(facilityId, facility);

    if (!defaultModel) {
        throw new Error('Default model not found');
    }
    // STEP 4 - get systems and build hierarchy of systems and subsystems
    const items = await client.getSystems(defaultModel.modelId);
    const systems = [];
    const subsystems = [];

    for (const item of items) {
        const name = item[QC.OName] ?? item[QC.Name];
        const parent = item[QC.Parent];

        if (parent) {
            // STEP 5 - if item has parent then it is subsystem - decode its parameters
            // using facility template to get parameter names
            const parameters = getSubsystemParameters(item[QC.Settings], facilityTemplate);

            subsystems.push({
                name: name,
                key: item[QC.Key],
                parent: parent,
                parameters
            });
        } else {
            systems.push({
                name,
                key: item[QC.Key],
                systemId: Encoding.toSystemId(Encoding.toFullKey(item[QC.Key], true)),
            });
        }
    }
    // STEP 6 - print systems and their subsystems
    systems.sort((a, b) => a.name.localeCompare(b.name));
    for (const system of systems) {
        console.log(`System: ${system.name} (${system.systemId})`);
        const items = subsystems.filter(s => s.parent === system.key);

        for (const item of items) {
            console.log(`  Subsystem: ${item.name}`);
            for (const param of item.parameters) {
                console.log(`    ${param.name}: ${param.value}`);
            }
        }
    }
}

/**
 * Helper function to decode subsystem parameters
 * 
 * @param {string} encodedSettings 
 * @param {any} facilityTemplate 
 * @returns {Array<{name: string, uuid: string, value: any}>}
 */
function getSubsystemParameters(encodedSettings, facilityTemplate) {
    const parameters = [];

    try {
        const config = Encoding.decode(encodedSettings);
        const configObj = JSON.parse(config);

        for (const [key, value] of Object.entries(configObj)) {
            const match = key.match(/^\[(.+?)\]\[(.+?)\]$/);

            if (!match) {
                continue;
            }
            const [, uuid] = match;
            const params = facilityTemplate.psets.flatMap(pset =>
                pset.parameters.find(p => p.uuid === uuid));
                    
            if (params.length > 0) {
                parameters.push({
                    name: params[0].name,
                    uuid,
                    value
                });
            }
        }
    } catch (err) {
        console.error('Error decoding parameters', err);
    }
    return parameters;
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
