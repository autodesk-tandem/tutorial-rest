import { Environment } from './constants.js';

const paths = {
    'prod': 'https://developer.api.autodesk.com',
    'stg': 'https://developer-stg.api.autodesk.com',
};

/**
 * Creates 2-legged token using provided inputs.
 * @param {string} clientID 
 * @param {string} clientSecret 
 * @param {string} scope 
 * @param {"prod"|"stg"} [env="prod"] 
 * @returns {Promise<string>}
 */
export async function createToken(clientID, clientSecret, scope, env = Environment.Production) {
    const auth = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');
    const options = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': scope
    });
    const url = `${paths[env]}/authentication/v2/token?${options}`;
    const tokenResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`
        }
    });

    if (tokenResponse.status !== 200) {
        throw new Error(tokenResponse.statusText);
    }
    const token = await tokenResponse.json();

    return token.access_token;
}
