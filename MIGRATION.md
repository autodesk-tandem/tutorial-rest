# Migration to the v3 model schema

This document summarizes steps for migration of REST API examples to work with v3 schema.

## Summary
V3 changes where some elements are stored and how several element types are identified. Sections below contain addtional details.

## LBS
v3 data model is using LBS (Location Breakdown Structure) to describe location structure (level - room). Location information is stored using `QC.Location` resp. `QC.OLocation` column. The value is encoded array of xrefs - use `Encoding.fromXrefKeyArray` to get list of model IDs and element IDs.

## Key encoding
For v3 of data model `POST scan` endpoint returns full 24-byte element keys. Consumers no longer need to convert return keys between short and full form.

Other key types (i.e. xref) are still used for cross-model references. Utility functions are available to encode and decode xref keys.

## Elements
Some elements (i.e. assets, levels, rooms, streams, tickets) are stored in default model of the facility. This reduces need to iterate through all facility models - in most cases it's sufficient to work with default model only. Use `getDefaultModel` function to find default model in the list of facility models.

When elements references an element from other model, decode it's key using `Encoding.fromXrefKey` function and query corresponding model for additional details.

## Element Flags
Element flags are encoded in the first four bytes of the 24-byte element key. Call `Encoding.getElementFlags(key)` to get element flags and compare the result with appropriate `ElementFlags` constant. Missing or invalid keys return `ElementFlags.Unknown`.

## Assets
In v3 assets are stored separately from source BIM elements. Call `Encoding.getElementFlags(key)` to get flags of the element and compare result to `ElementFlags.GenericAsset`.
- Use `QC.BimElmOfAsset` column to find link between asset and its BIM element. The value is xref key (can be decoded using `Encoding.fromXrefKey` function). Note that this column is optional - Tandem supports scenarios when asset doesn't need to be connected to BIM element.
- Use `QC.HostOfAsset` column to find link between BIM element and its related asset. The value is xref key. This column is also optional.

## Family Types
The value of element flag for the family type is changed in v3 schema. Call utility function `isFamilyType` to check if element represents family type, for example:
```javascript
const flags = Encoding.getElementFlags(element[QC.Key]);
const familyType = isFamilyType(flags);
```
Family types apply only to BIM data and are not carride over to assets.

## Levels
Levels are handled differently in v3 - level is part of LBS. The element flag of the level element is `ElementFlags.Location` and Tandem category of the element is `TC.Levels` (`L.Lv`).
Call utility function `isLevel(element)` to check if element is level.

## Rooms
Rooms are handled differently in v3 - room is part of LBS. The element flag of the room element is `ElementFlags.Location` and Tandem category of the element is `TC.Rooms` (`L.Rm`).
Call utility function `isRoom(element)` to check if element is room.
Parent (`QC.Parent`) of the room is level.

## Streams
The value of element flag for the stream is changed in v3 schema. Call utility function `isStream` to check if element represents stream, for example:
```javascript
const flags = Encoding.getElementFlags(element[QC.Key]);
const stream = isStream(flags);
```

