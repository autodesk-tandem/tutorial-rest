/*
    This example demonstrates how assign classification to the element. The scenario is quite simple - there is hardcoded mapping between element name
    and classification. I can be used as reference sample in case that more advanced logic is needed.
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import { TandemClient } from '../common/tandemClient.js';
import { ColumnFamilies, ColumnNames, MutateActions, QC } from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token to authenticate subsequent API calls
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read data:write');
    const client = new TandemClient(() => {
        return token;
    });

    // STEP 2 - get facility & facility template
    const facilityId = FACILITY_URN;
    const facility = await client.getFacility(facilityId);
    const template = await client.getFacilityTemplate(facilityId);
    // this defines mapping between element name and classification
    const elementClassMap = {
        'Door - Interior - Double' : 'Interior Doors',
        'Door - Interior - Single' : 'Interior Doors',
        'Door - Exterior - Double' : 'Exterior Doors',
        'Door - Exterior - Single' : 'Exterior Doors'
    };
    // STEP 3 - build map between element name and classification id
    const classMap = new Map();

    for (const name in elementClassMap) {
        const className = elementClassMap[name];
        const classData = template.classification.rows.find(r => {
            return r[1] === className;
        });

        if (classData) {
            classMap.set(name, classData[0]);
        }
    }
    // STEP 4 - iterate through facility models and apply classification based on mapping
    for (const link of facility.links) {
        const elements = await client.getElements(link.modelId);
        const keys = [];
        const mutations = [];

        for (const element of elements) {
            const elementName = element[QC.Name];

            if (!elementName) {
                continue;
            }
            if (!classMap.has(elementName)) {
                continue;
            }
            const classId = classMap.get(elementName);

            // we don't want to apply same classification again
            if ((element[QC.Classification] === classId) || (element[QC.OClassification] === classId)) {
                continue;
            }
            console.log(`${elementName}:${element[QC.Key]}`);
            // store keys and mutations
            keys.push(element[QC.Key]);
            mutations.push([
                MutateActions.Insert,
                ColumnFamilies.Standard,
                ColumnNames.OClassification,
                classId
            ]);
        }
        if (keys.length === 0) {
            continue;
        }
        // STEP 5 - apply changes
        await client.mutateElements(link.modelId, keys, mutations, 'Update classification');

        console.log(`Updated elements: ${keys.length}`);
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
