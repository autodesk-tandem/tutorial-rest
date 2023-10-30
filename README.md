# Autodesk Tandem Data REST API - Tutorials
This repository contains various examples of how to use the Autodesk Tandem Data REST API to achieve certain workflows. These are reference implementations that can be adopted for specific scenarios.

## Prerequisites
The examples are written in JavaScript and require [Node.js](https://nodejs.org/en).

### Dependencies
Use `npm` to install required dependencies

```sh
npm i
```

## Configuration
The examples use 2-legged authentication in cases where authentication is needed. This requires that an application be added to a facility as a service:
1. Create new application using the [APS Portal](https://aps.autodesk.com/myapps/).
2. Open the facility in Autodesk Tandem.
3. Navigate to the "Users" tab on the left panel, then select "Service" and enter the *Client ID* of the application from step 1 above. Make sure to specify the correct permissions.
4. After this, the application should be able to use a 2-legged token when interacting with the facility.

**NOTE:** As an alternative,the application can be added to your Tandem account. In this case the application will have access to all facilities owned by the account.

## Usage
Most of the examples are self-contained. To run a specific example, use the following steps:
1. Open the folder using your code editor.
2. Locate the example you want to run and open it.
3. At the top of the source file there is a block of source code with global variables. Replace those variables according to your environment:
  ``` js
  // update values below according to your environment
  const APS_CLIENT_ID = 'YOUR_CLIENT_ID';
  const APS_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
  const FACILITY_URN = 'YOUR_FACILITY_URN';
  ```
4. Check `main` function and place breakpoints as needed.
5. Start debugger. During debugging use the debuger windows to inspect values of variables.

### How to use in the browser environment?
The examples can be executed using Node.js runtime. When using in the browser environment it's necessary to use polyfill for Node.js [Buffer](https://nodejs.org/api/buffer.html) - i.e. [this one](https://github.com/feross/buffer).

## Examples
The examples are organized into multiple folders based on topic:
* **assets** - asset related examples
* **classification** - classification related examples
* **facility** - facility related examples
* **streams** - streams related examples
* **systems** - system related examples
