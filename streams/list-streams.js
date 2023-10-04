/*
    This example demonstrates how to get streams from given facility and get stream details (name, parent).
    
    It uses 2-legged authentication - this requires that application is added to facility as service.
*/
import { createToken } from '../common/auth.js';
import {
    ColumnFamilies,
    ElementFlags,
    Encoding,
    QC,
    getDefaultModel
} from '../common/utils.js';

// update values below according to your environment
const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const FACILITY_URN = 'YOUR_FACILITY_URN';

async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken(APS_CLIENT_ID,
        APS_CLIENT_SECRET, 'data:read');
    
    // STEP 2 - get facility and default model. The default model has same id as facility
    const facilityId = FACILITY_URN;
    const facility = await getFacility(token, facilityId);
    const defaultModel = getDefaultModel(facilityId, facility);

    // STEP 3 - get streams and their parents
    const streams = await getStreams(token, defaultModel.modelId);
    const modelStreamMap = {};

    for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        // host is stored as parent
        const parentXref = stream[QC.XParent];

        if (!parentXref) {
            continue;
        }
        // decode xref key of the host
        const [ modelId, key ] = Encoding.fromXrefKey(parentXref);

        let items = modelStreamMap[modelId];

        if (!items) {
            items = [];
            modelStreamMap[modelId] = items;
        };
        items.push({
            key,
            streamIndex: i
        });
    }
    // STEP 5 - print name of stream + name of parent
    // note we use batch query to get properties of multiple elements
    // in one call rather than query server for each element
    for (const modelId in modelStreamMap) {
        const items = modelStreamMap[modelId];
        const keys = items.map(n => n.key);
        const elementData = await getElementData(token, `urn:adsk.dtm:${modelId}`, keys);
        
        for (const item of items) {
            const stream = streams[item.streamIndex];
            const parentData = elementData.find(i => i.k === item.key);

            if (!parentData) {
                continue;
            }
            console.log(`${stream[QC.Name]}:${parentData[QC.Name]}`);
        }
    }
}

/**
 * Returns facility based on given URN.
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object>}
 */
async function getFacility(token, urn) {
    const response = await fetch(`https://tandem.autodesk.com/api/v1/twins/${urn}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    return data;
}

/**
 * Return array of stream elements from given model. The elements include standard (n) and xref (x) properties.
 * @param {string} token 
 * @param {string} urn 
 * @returns {Promise<object[]>}
 */
async function getStreams(token, urn) {
    const inputs = {
        families: [ ColumnFamilies.Standard, ColumnFamilies.Xrefs ],
        includeHistory: false,
        skipArrays: true
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v2/modeldata/${urn}/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });

    const data = await response.json();
    const results = [];

    for (const item of data) {
        if ((item[QC.ElementFlags] & ElementFlags.Stream) === ElementFlags.Stream) {
            results.push(item);
        }
    }
    return results;
}

/**
 * Returns data of given elements. Includes standard (n) properties.
 * @param {string} token 
 * @param {string} urn 
 * @param {string[]} keys 
 * @returns {Promise<object>}
 */
async function getElementData(token, urn, keys) {
    const inputs = {
        keys: keys,
        families: [ ColumnFamilies.Standard ],
        includeHistory: false,
        skipArrays: true
    };
    const response = await fetch(`https://tandem.autodesk.com/api/v2/modeldata/${urn}/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
    });

    const data = await response.json();

    return data;
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

