import * as fs from 'fs';
import { Readable, Transform } from 'stream';
import { finished } from 'stream/promises';
import StreamArray from 'stream-json/streamers/StreamArray.js';

import { ColumnFamilies, ColumnNames, ElementFlags, Environment, MutateActions, QC } from './constants.js';

const paths = {
    'prod': {
        app: 'https://tandem.autodesk.com',
        base: 'https://developer.api.autodesk.com/tandem/v1'
    },
    'stg': {
        app: 'https://tandem-stg.autodesk.com',
        base: 'https://tandem-stg.autodesk.com/api/v1'
    }
};

/**
 * Simple wrapper for Tandem REST API
 */
export class TandemClient {

    /**
     * The callback provides valid authentication token
     *
     * @callback authCallback
     * @returns {string}
     */

    /**
     * Class constructor. It accepts function which returns valid authentication token.
     * 
     * @param {authCallback} authProvider
     * @param {"prod"|"stg"} [env="prod"] 
     */
    constructor(authProvider, env = Environment.Production) {
        this._appBasePath = paths[env].app;
        this._appPath = `${this._appBasePath}/app`;
        this._basePath = paths[env].base;
        this._clientPath = `${this._appBasePath}/client/viewer/1.0.567`;
        this._otgPath = `${this._appBasePath}/otg`;
        this._authProvider = authProvider;
    }

    get appBasePath() {
        return this._appBasePath;
    }

    get appPath() {
        return this._appPath;
    }

    get basePath() {
        return this._basePath;
    }

    get clientPath() {
        return this._clientPath;
    }

    get otgPath() {
        return this._otgPath;
    }

    /**
     * Applies template to facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {object} template - input facility template.
     */
    async applyFacilityTemplate(facilityId, template) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/template`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(template)
        });
        
        return;
    }

    /**
     * Checks access to the facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @returns {Promise<string | null>}
     */
    async checkFacilityAccess(facilityId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}`, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.headers.get('x-dt-access-level');
    }

    /**
     * Clones given facility.
     * 
     * @param {string} groupId 
     * @param {string} facilityId 
     * @returns {Promise<object>}
     */
    async cloneFacility(groupId, facilityId) {
        const token = this._authProvider();
        const input = {
            clone: {
                fromTwinUrn: facilityId
            }
        };
        const response = await fetch(`${this.basePath}/groups/${groupId}/clonetwin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(input)
        });
        const data = await response.json();

        return data;
    }

    /**
     * Creates link to upload file.
     * 
     * @param {string} facilityId 
     * @param {object} inputs 
     * @returns {Promise}
     */
    async confirmUpload(facilityId, inputs) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/confirmupload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });

        return;
    }

    /**
     * Adds default model to the facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {object} inputs 
     * @returns {Promise}
     */
    async createDefaultModel(facilityId, inputs) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/defaultmodel`, {
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
     * Adds documents to the facility.
     * 
     * @param {string} facilityId 
     * @param {object[]} inputs 
     * @returns {Promise<object>} 
     */
    async createDocuments(facilityId, inputs) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/documents`, {
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
     * Adds new element to the model.
     * 
     * @param {string} modelId - URN of the model.
     * @param {object} inputs 
     * @returns {Promise}
     */
    async createElement(modelId, inputs) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/modeldata/${modelId}/create`, {
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
     * @typedef {Object} TwinSettingsProps
     * @property {{ key: string, value: Object }} props
     */

    /**
     * @typedef {Object} TwinSettings
     * @property {TwinSettingsProps} props
     */

    /**
     * @typedef {Object} TwinCreateInfo
     * @property {TwinSettings} settings
     */

    /**
     * Creates new facility.
     * 
     * @param {string} groupId - URN of the group. 
     * @param {TwinCreateInfo} inputs 
     * @returns {Promise<object>} 
     */
    async createFacility(groupId, inputs) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/groups/${groupId}/twins`, {
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
     * Adds new model to the facility.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {object} inputs 
     * @returns {Promise<object>}
     */
    async createModel(facilityId, inputs) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/model`, {
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
     * Creates new stream using provided data
     * 
     * @param {string} urn - URN of the model
     * @param {string} name - Name of the stream
     * @param {string} uniformatClass 
     * @param {number} categoryId 
     * @param {string} [classification]
     * @param {string} [parentXref]
     * @param {string} [roomXref]
     * @param {string} [levelKey]
     * @returns {Promise}
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
     * Creates link to upload file.
     * 
     * @param {string} facilityId 
     * @param {string} fileName 
     * @returns {Promise<object>}
     */
    async createUploadLink(facilityId, fileName) {
        const token = this._authProvider();
        const inputs = {
            realFileName: fileName
        };
        const response = await fetch(`${this.basePath}/twins/${facilityId}/s3uploadlink`, {
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
     * Creates saved view based on provided input.
     * 
     * @param {string} facilityId 
     * @param {any} view 
     * @returns {Promise<any>}
     */
    async createView(facilityId, view) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/views`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(view)
        });
        const data = await response.json();

        return data;
    }

    /**
     * Deletes given elements from the model.
     * 
     * @param {string} modelId - urn of the model.
     * @param {string[]} keys - element keys to delete.
     * @param {string} desc - description of the operation.
     * @returns {Promise<object>}
     */
    async deleteElements(modelId, keys, desc) {
        const mutations = [];

        Array(keys.length).fill([ MutateActions.DeleteRow, '', '', '']);
        const result = await this.mutateElements(modelId, keys, mutations, desc);

        return result;
    }

    /**
     * Deletes stream data from given keys.
     * 
     * @param {string} modelId - urn of the model which owns the streams.
     * @param {string[]} keys - stream keys (fully qualified).
     * @param {string[]} [substreams] - optional array of parameter ids to delete their value. if not provided all stream data will be deleted.
     * @param {string} [from] - optional lower time boundary (yyyy-MM-dd)
     * @param {string} [to] - optional upper time boundary (yyyy-MM-dd)
     * @returns {Promise<void>}
     */
    async deleteStreamsData(modelId, keys, substreams = undefined, from = undefined, to = undefined) {
        const token = this._authProvider();
        const inputs = {
            keys: keys
        };
        const queryParams = new URLSearchParams();

        if (substreams) {
            queryParams.append('substreams', `${substreams.join(',')}`);
        }
        if (from) {
            queryParams.append('from', `${from}`);
        }
        if (to) {
            queryParams.append('to', `${to}`);
        }
        // if there are no input parameters, then delete all stream data
        if (!queryParams.has('substreams')) {
            queryParams.append('allSubstreams', '1');
        }
        let url = `${this.basePath}/timeseries/models/${modelId}/deletestreamsdata`;

        if (queryParams.size > 0) {
            url += `?${queryParams}`;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        
        const err = await response.text();

        return;
    }

    /**
     * Returns stored classifications.
     * 
     * @returns {Promise<object[]>}
     */
    async getClassifications() {
        const token = this._authProvider();
        const response = await fetch(`${this.clientPath}/classifications.json`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns details for given document.
     * 
     * @param {string} facilityId - URN of the facility.
     * @param {string} documentId - URN of the document.
     * @returns {Promise<object>}
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
     * 
     * @param {string} urn - URN of the model.
     * @param {string} key - key of the element. 
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @returns {Promise<object[]>}
     */
    async getElement(urn, key, columnFamilies = [ ColumnFamilies.Standard ]) {
        const data = await this.getElements(urn, [ key ] , columnFamilies);
    
        return data[0];
    }

    /**
     * Returns elements from given model.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [keys] - optional array of keys. 
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @param {boolean} [includeHistory] - controls if history is included.
     * @returns {Promise<object[]>}
     */
    async getElements(urn, keys = undefined, columnFamilies = [ ColumnFamilies.Standard ], includeHistory = false) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: includeHistory,
            skipArrays: true
        };
        if (keys && keys.length > 0) {
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
    
        return data.slice(1);
    }

    /**
     * Reads elements from model using streaming.
     * 
     * @param {string} modelId - URN of the model.
     * @param {string[]} [columnFamilies] - optional array of column families.
     * @yields {Promise<object>} - async iterator of elements.
     */
    async *getElementStream(modelId, columnFamilies = [ ColumnFamilies.Standard ]) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: false,
            skipArrays: true
        };

        const response = await fetch(`${this.basePath}/modeldata/${modelId}/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
        const elementStream = Readable.fromWeb(response.body).pipe(StreamArray.withParser()).pipe(new ElementFilter());

        yield* elementStream;
    }

    /**
     * Returns facility based on given URN.
     * 
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
     * 
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
     * Returns stored facility templates.
     * 
     * @returns {Promise<object[]>}
     */
    async getFacilityTemplates() {
        const token = this._authProvider();
        const response = await fetch(`${this.clientPath}/facilityTemplates.json`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        return data;
    }

    /**
     * Returns dictionary of facility users.
     * 
     * @param {string} facilityId 
     * @returns {Promise<Object.<string, object>>}
     */
    async getFacilityUsers(facilityId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        return data;
    }

    /**
     * Returns group details.
     * 
     * @param {string} groupId - URN of the group.
     * @returns {Promise<object>}
     */
    async getGroup(groupId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/groups/${groupId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns list of facilities for given group.
     * 
     * @param {string} groupId - URN of the group.
     * @returns {Promise<object>}
     */
    async getGroupFacilities(groupId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/groups/${groupId}/twins`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns list of groups.
     * 
     * @returns {Promise<object[]>}
     */
    async getGroups() {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/groups`, {
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
     * 
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
     * Returns manifest for given URN.
     * 
     * @param {string} urn - URN of the document.
     * @returns {Promise<object>}
     */
    async getManifest(urn) {
        const token = this._authProvider();
        const response = await fetch(`${this.otgPath}/modeldata/manifest/${urn}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns metadata of the model.
     * 
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
     * Returns model changes.
     * 
     * @param {string} modelId - URN of the model.
     * @param {number[]} timestamps - array of timestamps.
     * @param {boolean} [includeChanges] - include change details.
     * @param {boolean} [useFullKeys] - include full keys. Used only if includeChanges = true.
     * @returns {Promise<object[]>}
     */
    async getModelHistory(modelId, timestamps, includeChanges = false, useFullKeys = false) {
        const token = this._authProvider();
        const inputs = {
            timestamps: timestamps,
            includeChanges: includeChanges,
            useFullKeys: useFullKeys
        };

        const response = await fetch(`${this.basePath}/modeldata/${modelId}/history`, {
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
     * Returns model changes.
     * 
     * @param {string} modelId - URN of the model.
     * @param {number} from - timestamp of start date.
     * @param {number} to - timestamp of end date.
     * @param {boolean} [includeChanges] - include change details.
     * @param {boolean} [useFullKeys] - include full keys. Used only if includeChanges = true.
     * @returns {Promise<object[]>}
     */
    async getModelHistoryBetweenDates(modelId, from, to, includeChanges = true, useFullKeys = true) {
        const token = this._authProvider();
        const inputs = {
            min: from,
            max: to,
            includeChanges: includeChanges,
            useFullKeys: useFullKeys
        };

        const response = await fetch(`${this.basePath}/modeldata/${modelId}/history`, {
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
     * Returns model properties including status.
     * 
     * @param {string} modelId - URN of the model
     * @returns {Promise<object>}
     */
    async getModelProps(modelId) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/models/${modelId}/props`, {
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
     * 
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
     * Returns stored parameters.
     * 
     * @returns {Promise<object[]>}
     */
    async getParameters() {
        const token = this._authProvider();
        const response = await fetch(`${this.clientPath}/parameters.json`, {
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
     * 
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
     * Returns stream data.
     * 
     * @param {string} urn - URN of the model.
     * @param {string} streamKey - full key of the stream. 
     * @param {number} [from] - lower time boundary (in Unix epoch).
     * @param {number} [to] - upper time boundary (in Unix epoch).
     * @param {number} [limit] - number of entries to return.
     * @param {"asc"|"desc"} [sort] - sort order.
     * @returns {Promise<object>}
     */
    async getStreamData(urn, streamKey, from, to, limit, sort) {
        const queryParams = new URLSearchParams();

        if (from) {
            queryParams.append('from', `${from}`);
        }
        if (to) {
            queryParams.append('to', `${to}`);
        }
        if (limit) {
            queryParams.append('limit', `${limit}`);
        }
        if (sort) {
            queryParams.append('sort', `${sort}`);
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
     * Returns last stream readings.
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} keys - list of stream kes. 
     * @returns {Promise<object>}
     */
    async getStreamLastReading(urn, keys) {
        const input = {
            keys
        };
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/timeseries/models/${urn}/streams`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(input)
        });
        const data = await response.json();

        return data;
    }

    /**
     * Returns stream elements from given model.
     * 
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
     * Returns secrets for streams.
     * 
     * @param {string} urn - the URN of the facility.
     * @param {string[]} keys - list of stream keys to query.
     * @returns {Promise<object>}
     */
    async getStreamsSecrets(urn, keys) {
        const token = this._authProvider();
        const inputs = {
            keys: keys
        };
        const response = await fetch(`${this.basePath}/models/${urn}/getstreamssecrets`, {
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
     * Returns system elements from given model.
     * 
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
     * 
     * @param {string} urn - URN of the model.
     * @param {string[]} [columnFamilies] - optional list of columns
     * @param {boolean} [includeHistory] - controls if history information is included in response
     * @returns {Promise<object[]>}
     */
    async getTaggedAssets(urn, columnFamilies = [ ColumnFamilies.Standard, ColumnFamilies.DtProperties, ColumnFamilies.Refs ], includeHistory = false) {
        const token = this._authProvider();
        const inputs = {
            families: columnFamilies,
            includeHistory: includeHistory,
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
     * Returns saved facility views.
     * 
     * @param {string} urn - URN of the facility.
     * @returns {Promise<object[]>} - array of views.
     */
    async getViews(urn) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${urn}/views`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        return data;
    }

    /**
     * Imports model for given facility. The model must be created using {@link createModel} function.
     * 
     * @param {string} facilityId 
     * @param {object} inputs
     * @returns {Promise} 
     */
    async importModel(facilityId, inputs) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputs)
        });
    }

    /**
     * Applies provided changes (mutations) to the elements.
     * 
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
     * 
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
     * Saves document content to file.
     * 
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

    /**
     * Saves document content to file.
     * 
     * @param {string} urn
     * @param {string} streamKey
     * @param {any} data
     * @returns {Promise} 
     */
    async sendStreamData(urn, streamKey, data) {
        const token = this._authProvider();
        const url = `${this.basePath}/timeseries/models/${urn}/streams/${streamKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
    }

    /**
     * Updates facility based on provided inputs.
     * 
     * @param {string} facilityId - URN of the facility
     * @param {object} facilityData - facility data
     * @param {string} etag - last modification time
     * @returns {Promise<object>}
     */
    async updateFacility(facilityId, facilityData, etag) {
        const token = this._authProvider();
        const response = await fetch(`${this.basePath}/twins/${facilityId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Etag': etag
            },
            body: JSON.stringify(facilityData)
        });
        const data = await response.json();

        return data;
    }
}

class ElementFilter extends Transform {
    constructor(elementFlags) {
        super({ objectMode: true });
        this._elementFlags = elementFlags;
    }

    _transform(chunk, encoding, callback) {
        if (chunk.value?.[QC.Key]) {
            if (this._elementFlags === undefined) {
                this.push(chunk.value);
            }
            if ((this._elementFlags !== undefined) && (chunk.value[QC.ElementFlags] === this._elementFlags)) {
                this.push(chunk.value);
            }
        }
        callback();
    }
}
