# Autodesk Tandem REST API - Tutorials
This repository contains various examples on how to use Autodesk Tandem REST API to achieve certain workflows. Those are supposed to provide a reference implementation that can be adopted for specific scenario.

## Prerequisites
The examples are written in JavaScript and require [Node.js](https://nodejs.org/en).

### Dependencies
Use `npm` to install required dependencies

```sh
npm i
```
## Configuration
The examples use 2-legged authentication in case when authentication is needed. This needs that application is added to facility as service:
1. Create new application using [APS Portal](https://aps.autodesk.com/myapps/).
2. Open facility in Autodesk Tandem.
3. Navigate to Users, then select Service and enter *Client ID* of application from step 1 above. Make sure to specify correct permission.
4. After this aplication should be able to use 2-legged token when interaction with facility.

**Note** As an alternate option application can be added to the account. In this case the application will have access to all facilities owned by the account.

## Usage
Most of the examples are self-contained. To run the example use following steps:
1. Open folder using your code editor.
2. Locate example you want to run and open it.
3. On top of the file there is block with global variables. Replace thouse variables according to your environment:
  ``` js
  // update values below according to your environment
  const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
  const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
  const FACILITY_URN = 'YOUR_FACILITY_URN';
  ```
4. Check `main` function and place breakpoints as needed.
5. Start debugger. During debugging use debuger windows to inspect values of variables.

## Examples
The examples are organized into multiple folders based on topic:
* **assets** - asset related examples
* **facility** - facility related examples
* **streams** - streams related examples
