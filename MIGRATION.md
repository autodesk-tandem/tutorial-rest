# Migration to the v3 model schema

This document summarizes steps for migration of REST API examples to work with v3 schema.

## Summary
V3 changes where logical elements are stored and how several element types are identified. Sections below contain addtional details.

## LBS
v3 data model is using LBS (Location Breakdown Structure) to describe location structure (level - room).

## Key encoding
For v3 of data model `POST scan` endpoint returns full 24-byte element keys. Consumers no longer need to convert return keys between short and full form.

Other key types (i.e. xref) are still used for cross-model references. Utility functions are available to encode and decode xref keys.

## Logical elements
All logical elements (i.e. assets, levels, rooms, streams, tickets) are stored in default model of the facility. This reduces need to iterate through all facility models - in most cases it's sufficient to work with default model only. Use `getDefaultModel` function to find default model in the list of facility models.

When logical elements references an element from other model, decode it's key using `Encoding.fromXrefKey` function and query corresponding model for additional details.

## Assets
In v3 assets are stored separately from source BIM elements. The value of `QC.ElementFlags` column is `ElementFlags.GenericAsset`.
- Use `QC.BimElmOfAsset` column to find link between asset and its BIM element. The value is xref key (can be decoded using `Encoding.fromXrefKey` function).
- Use `QC.HostOfAsset` column to find link between BIM element and its related asset. The value is xref key.

## Family Types
The value of element flag for the family type is changed in v3 schema. Call utility function `isFamilyType(element[QC.ElementFlags])` to check if element represents family type for current schema.

## Levels
Levels are handled differently in v3 - level is part of LBS. The element flag of the level element is `ElementFlags.Location` and Tandem category of the element is `TC.Levels` (`L.Lv`).
Use `isLevel` function to check if element is level.

## Rooms
Rooms are handled differently in v3 - room is part of LBS. The element flag of the room element is `ElementFlags.Location` and Tandem category of the element is `TC.Rooms` (`L.Rm`).
Use `isRoom` function to check if element is room.
Parent (`QC.Parent`) of the room is level.

## Streams
The value of element flag for the stream is changed in v3 schema. Call utility function `isStream(element[QC.ElementFlags])` to check if element represents stream for current schema.
