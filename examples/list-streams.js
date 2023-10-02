/*
    This example demonstrates how to get streams from given facility and get stream details (name, parent). It uses 2-legged
    authentication - this requires that application is added to facility as service.
*/
async function main() {
    // STEP 1 - obtain token. The sample uses 2-legged token but it would also work with 3-legged token
    // assuming that user has access to the facility
    const token = await createToken('YOUR_CLIENT_ID',
        'YOUR_CLIENT_SECRET', 'data:read');
    
    // STEP 2 - get facility and default model. The default model has same id as facility
    const facilityId = 'YOUR_FACILITY_URN';
    const facility = await getFacility(token, facilityId);
    const defaultModelId = facilityId.replace('urn:adsk.dtt:', 'urn:adsk.dtm:');
    const defaultModel = facility.links.find((m) => {
        return  m.modelId === defaultModelId;
    });

    // STEP 3 - get streams and print stream + its parent
    const streams = await getStreams(token, defaultModel.modelId);

    for (const stream of streams) {
        // host is stored as parent
        const parentXref = stream['x:p'];

        if (!parentXref) {
            continue;
        }
        // the id of the host is encoded
        const [ modelId, key ] = decodeXref(parentXref);

        const elementData = await getElementData(token, `urn:adsk.dtm:${modelId}`, key);

        if (!elementData) {
            continue;
        }
        // print out name of stream + name of parent
        console.log(`${stream['n:n']}:${elementData['n:n']}`);
    }
}

/**
 * Creates 2-legged token using provided inputs.
 * @param {string} clientID 
 * @param {string} clientSecret 
 * @param {string} scope 
 * @returns {Promise<string>}
 */
async function createToken(clientID, clientSecret, scope) {
    const auth = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');
    const options = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': scope
    });

    const tokenResponse = await fetch(`https://developer.api.autodesk.com/authentication/v2/token?${options}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`
        }
    });

    const token = await tokenResponse.json();

    return token.access_token;
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
        families: [ 'n', 'x'],
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
        if ((item['n:a'] & 0x01000003) === 0x01000003) {
            results.push(item);
        }
    }
    return results;
}

/**
 * Returns data of given element. Includes standard (n) properties.
 * @param {string} token 
 * @param {string} urn 
 * @param {string} key 
 * @returns {Promise<object>}
 */
async function getElementData(token, urn, key) {
    const inputs = {
        keys: [ key ],
        families: [ 'n' ],
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

    if (data.length > 0) {
        return data[1];
    }
    return undefined;
}

/**
 * Decodes xref key and returns model id and element key.
 * @param {string} xref 
 * @returns {string[]}
 */
function decodeXref(xref) {
    const binData = Buffer.from(xref, 'base64');
    const modelBuff = Buffer.alloc(16);
    
    binData.copy(modelBuff, 0);
    const modelId = makeWebsafe(modelBuff.toString('base64'));
    const keyBuff = Buffer.alloc(24);

    binData.copy(keyBuff, 0, 16);
    const key = makeWebsafe(keyBuff.toString('base64'));

    return [ modelId, key ];
}

/**
 * Returns URL safe string.
 * @param {string} text 
 * @returns {string}
 */
function makeWebsafe(text) {
	return text.replace(/\+/g, '-') // Convert '+' to '-' (dash)
		.replace(/\//g, '_') // Convert '/' to '_' (underscore)
		.replace(/=+$/, ''); // Remove trailing '='
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

