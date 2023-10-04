import fetch from 'node-fetch';

/*
This example demonstrates how to send sensor readings to Tandem for many sensors at once, using a global per-facility endpoint
*/

async function main() {
	/*
		STEP 1: Construct payload
		Autodesk Tandem expects payload to be a valid JSON
		in the given example we will report readings from two sensors, containing air temperature and air pressure values

		NOTE: Please keep in mind that Tandem supports arbitrary payloads, so, an extra configuration step in UI is required to explan Tandem how to parse incoming payload. See https://autodesk-tandem.github.io/API_streams.html for the reference

		NOTE: by default, Tandem will use server time to associate data points with. You can supply your own time using fields ("time", "timestamp" or "epoch") on the root level of your payload. Note on supported time formats is here https://forums.autodesk.com/t5/tandem-forum/streams-highlight-supported-timestamp-formats/td-p/11989221

		NOTE: since this payload type contains readings from multiple sensors, you need to supply a routing information. Specifically, you need to indicate which Tandem stream, every event belongs to. Standard way is to add "id" property on the root level of every event. It should be set to the Tandem element ID, that you can obtain e.g. by exporting Tandem streams to CSV using UI.

		There is also an option to customize path of the routing information, by using "idpath" query parameter for the POST request. For instance, if your payload is nested (e.g. JSON API), you can use dot-notation to hint Tandem API on where to search for routing information: http://<POST request with sensor readings>?idpath=data.tandemID, assuming your event looks like:
		{
			data: {
				temperatureValue: 25,
				pressureValue: 100,
				tandemID: 'AQAAAJVLslwb80o0jqA8wgUzxPYAAAAA',
			},
		}
	*/
	const payload = [
		{
			temperatureValue: 25,
			pressureValue: 100,
			id: 'AQAAAJVLslwb80o0jqA8wgUzxPYAAAAA',
		},
		{
			temperatureValue: 23,
			pressureValue: 95,
			id: 'AQAAAJVLslwb90o0jqA9wgUzxQYAAAAA',
		},
	];

	const wantToDefineMyOwnTimestamp = false;

	if (wantToDefineMyOwnTimestamp) {
		payload.forEach((p) => {
			p.timestamp = new Date().getTime();
		});
	}

	/*
		STEP 2: Make sure auth token is provided and POST the data
		When ingesting data to individual streams, each stream has it's own secret value, that has to be provided in the HTTP call via "authorization" header
	*/

	const modelID = '<your tandem facility ID>';
	const webhookURL = `https://tandem.autodesk.com/api/v1/timeseries/models/${modelID}/webhooks/generic`;

	// to obtain the secret, log in to the web version of tandem and run this snippet in dev console to get the secret(need to have "manage" access for that):
	// DT_APP.currentFacility.getStreamManager().getStreamSecret(DT_APP.currentFacility.getStreamManager().getRootElementID()).then(console.log)

	const secret = '<secret string>';

	const authHeaderValue = Buffer.from(':' + secret).toString('base64');

	const res = await fetch(webhookURL, {
		method: 'POST',
		body: JSON.stringify(payload),
		headers: {
			authorization: `Basic ${authHeaderValue}`,
		},
	});

	console.log('data ingestion response:', res.status, await res.text());
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
