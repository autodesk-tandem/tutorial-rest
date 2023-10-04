/**
 * Creates 2-legged token using provided inputs.
 * @param {string} clientID 
 * @param {string} clientSecret 
 * @param {string} scope 
 * @returns {Promise<string>}
 */
export async function createToken(clientID, clientSecret, scope) {
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
