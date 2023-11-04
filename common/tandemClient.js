import * as fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

import { ColumnFamilies, ColumnNames, ElementFlags, MutateActions, QC } from './utils.js';

/**
 * Simple wrapper for Tandem REST API
 */
export class TandemClient {

    /**
     * The callback provides valid authentication token
     
     * @callback authCallback
     * @returns {string}
     */

    /**
     * Class constructor. It accepts function which returns valid authentication token.
     * @param {authCallback} authProvider 
     */
    constructor(authProvider) {
        this._basePath = 'https://developer.api.autodesk.com/tandem/v1';
        this._authProvider = authProvider;
    }

    get basePath() {
        return this._basePath;
    }

    /**
     * Creates new stream using provided data
     * @param {string} token - Authentication token
     * @param {string} urn - URN of the model
     * @param {string} name - Name of the stream
     * @param {string} uniformatClass 
     * @param {number} categoryId 
     * @param {string} [classification]
     * @param {string} [parentXref]
     * @param {string} [roomXref]
     * @param {string} [levelKey]
     * @returns 
     */
    async createStream(urn, name, uniformatClass, categoryId, classification = undefined, parentXref = undefined, roomXref = undefined, levelKey = undefined) {
        const token = this._authProvider();
        const inputs = {
            muts: [
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Name, name ],
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.ElementFlags, ElementFlags.Stream ], // this flag identifies stream
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.UniformatClass, uniformatClass ],
                [ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.CategoryId, categoryId ],

            ],
            desc: 'Create stream'
        };

        if (classification) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Standard, ColumnNames.Classification, classification ]);
        }
        if (parentXref) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Parent, parentXref ]);
        }
        if (roomXref) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Xrefs, ColumnNames.Rooms, roomXref ]);
        }
        if (levelKey) {
            inputs.muts.push([ MutateActions.Insert, ColumnFamilies.Refs, ColumnNames.Level, levelKey ]);
        }
        const response = await fetch(`${this.basePath}/modeldata/${urn}/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });

        const data = await response.json();

        return data.key;
    }

    /**
     * Returns details for given document.
     * @param {string} facilityId - URN of the facility.
     * @param {string} documentId - URN of the document.
     * @returns {object}
     */
    async getDocument(facilityId, documentId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/documents/${documentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns single element from given model.
     * @param {string} urn - URN of the model.
     * @param {string} key - key of the element. 
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @returns {Promise<object[]>}
     */
    async getElement(urn, key, columnFamilies = [ ColumnFamilies.Standard ]) {
        const data = await this.getElements(urn, [ key ] , columnFamilies);
    
        return data[1];
    }

    /**
     * Returns elements from given model.
     * @param {string} urn - URN of the model.
     * @param {string[]} [keys] - optional array of keys. 
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @returns {Promise<object[]>}
     */
    async getElements(urn, keys = undefined, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        if (keys) {
            inputs.keys = keys;
        }
        const response = await fetch(`${this.basePath}/modeldata/${urn}/scan`, {
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
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns facility template based on facility URN.
     * @param {string} facilityId - URN of the facility
     * @returns {Promise<object>}
     */
    async getFacilityTemplate(facilityId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/inlinetemplate`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns level elements from given model.
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getLevels(urn, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const response = await fetch(`${this.basePath}/modeldata/${urn}/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        const data = await response.json();
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.Level) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns metadata of te model
     * @param {string} modelId - URN of the model
     * @returns {Promise<object>}
     */
    async getModel(modelId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/modeldata/${modelId}/model`, {
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
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/modeldata/${modelId}/schema`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns room elements from given model.
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getRooms(urn, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const response = await fetch(`${this.basePath}/modeldata/${urn}/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        const data = await response.json();
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.Room) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns stream data
     * @param {string} urn - URN of the model.
     * @param {string} streamKey - full key of the stream. 
     * @param {number} [from] - lower time boundary (in Unix epoch).
     * @param {number} [to] - upper time boundary (in Unix epoch).
     * @returns {object}
     */
    async getStreamData(urn, streamKey, from, to) {
        const queryParams = new URLSearchParams();

        if (from) {
            queryParams.append('from', `${from}`);
        }
        if (to) {
            queryParams.append('to', `${to}`);
        }
        const token = this._authProvider();
        let url = `${this.basePath}/timeseries/models/${urn}/streams/${streamKey}`;
        
        if (queryParams.size > 0) {
            url += `?${queryParams}`;
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns stream elements from given model.
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getStreams(urn, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const response = await fetch(`${this.basePath}/modeldata/${urn}/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        const data = await response.json();
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.Stream) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns system elements from given model.
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getSystems(urn, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const response = await fetch(`${this.basePath}/modeldata/${urn}/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        const data = await response.json();
        const results = [];

        for (const item of data) {
            if (item[QC.ElementFlags] === ElementFlags.System) {
                results.push(item);
            }
        }
        return results;
    }

    /**
     * Returns asset elements from given model. Tagged asset is element with custom properties ('z' family).
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @returns {Promise<object[]>}
     */
    async getTaggedAssets(urn, columnFamilies = [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };
        const response = await fetch(`${this.basePath}/modeldata/${urn}/scan`, {
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

    /**
     * Applies provided changes (mutations) to the elements.
     * @param {string} urn - URN of the model.
     * @param {string[]} keys - array of keys to modify.
     * @param {any[][]} mutations - arry of mutations.
     * @param {string} [description] - optional description.
     * @returns {Promise<object>}
     */
    async mutateElements(urn, keys, mutations, description = undefined) {
        const token = this._authProvider();
        const inputs = {
            keys,
            muts: mutations
        };

        if (description) {
            inputs.desc = description;
        }
        const response = await fetch(`${this.basePath}/modeldata/${urn}/mutate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        const result = await response.json();
        
        return result;
    }

    /**
     * Resets secrets for given streams.
     * @param {string} token
     * @param {string} urn 
     * @param {string[]} streamIds 
     * @param {boolean} [hardReset]
     * @returns {Promise}
     */
    async resetStreamsSecrets(urn, streamIds, hardReset) {
        const token = this._authProvider();
        const inputs = {
            keys: streamIds,
            hardReset: hardReset ? true : false
        };
        const response = await fetch(`${this.basePath}/models/${urn}/resetstreamssecrets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
    }

    /**
     * Saves document content to file
     * @param {string} url 
     * @param {string} fileName
     * @returns {Promise} 
     */
    async saveDocumentContent(url, fileName) {
        const token = this._authProvider();
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    
        if (res.status !== 200) {
            return;
        }
        const stream = fs.createWriteStream(fileName);
    
        await finished(Readable.fromWeb(res.body).pipe(stream));
    }
}
