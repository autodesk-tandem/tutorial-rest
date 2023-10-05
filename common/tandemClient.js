import { ColumnFamilies } from './utils.js';

/**
 * Simple wrapper for Tandem REST API
 */
export class TandemClient {

    /**
     * The callback provides valid authentication token
     
     * @callback tokenCallback
     * @returns {string}
     */

    /**
     * Class constructores. It accepts callback which returns valid authentication token.
     * @param {tokenCallback} getToken 
     */
    constructor(getToken) {
        this._basePath = 'https://tandem.autodesk.com/api/';
        this._getToken = getToken;
    }

    get basePath() {
        return this._basePath;
    }

    /**
     * 
     * @param {string} urn 
     * @param {string[]} keys 
     * @param {string[]} [columnFamilies]
     * @returns {Promise<object[]>}
     */
    async getElements(urn, keys = undefined, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._getToken();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        if (keys) {
            inputs.keys = keys;
        }
        const response = await fetch(`${this.basePath}v2/modeldata/${urn}/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
    
        const data = await response.json();
    
        return data;
    }

    /**
     * Returns facility based on given URN.
     * @param {string} facilityId - URN of the facility
     * @returns {Promise<object>}
     */
    async getFacility(facilityId) {
        const token = this._getToken();
        const response = await fetch(`${this.basePath}v1/twins/${facilityId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns schema of the model.
     * @param {string} modelId - URN of the model
     * @returns {Promise<object>}
     */
    async getModelSchema(modelId) {
        const token = this._getToken();
        const response = await fetch(`${this.basePath}v1/modeldata/${modelId}/schema`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns asset elements from given model. Tagged asset is element with custom properties ('z' family).
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getTaggetAssets(urn, columnFamilies = [ ColumnFamilies.Standard, ColumnFamilies.DtProperties ]) {
        const token = this._getToken();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const response = await fetch(`${this.basePath}v2/modeldata/${urn}/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        const data = await response.json();
        const results = [];

        for (const item of data) {
            const keys = Object.keys(item);
            const userProps = keys.filter(k => k.startsWith(`${ColumnFamilies.DtProperties}:`));

            if (userProps.length > 0) {
                results.push(item);
            }
        }
        return results;
    }
}
