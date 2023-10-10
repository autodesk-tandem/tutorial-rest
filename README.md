# Autodesk Tandem REST API - Tutorials
This repository contains various examples on how to use Autodesk Tandem REST API to achieve certain workflows. Those are supposed to provide a reference implementation that can be adopted for specific scenario.

## Prerequisites
The examples are written in JavaScript and require [Node.js](https://nodejs.org/en).

### Dependencies
Use `npm` to install required dependencies

```sh
npm i
```
## Usage
Most of the example are self-contained. To run the example simply open file in your code editor, adjust variables and run the code (usually under debugger which allows to check values of variables at runtime).

The examples use 2-legged authentication in case when authentication is needed. This needs that application is added to facility as service:
1. Create new application using [APS Portal](https://aps.autodesk.com/myapps/).
2. Open facility in Autodesk Tandem.
3. Navigate to Users, then select Service and enter *Client ID* of application from step 1 above. Make sure to specify correct permission.
4. After this aplication should be able to use 2-legged token when interaction with facility.

## Examples
The examples are organized into multiple folders based on topic:
* **assets** - asset related examples
* **streams** - streams related examples
