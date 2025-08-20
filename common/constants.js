/**
 * @type { Production: "prod"; Staging: "stg" }
 */
export const Environment = {
    Production: 'prod',
    Staging: 'stg'
};

export const Region = {
    US: 'US',
    EMEA: 'EMEA',
    AUS: 'AUS'
};

export const kModelIdSize = 16;
export const kElementIdSize = 20;
export const kElementFlagsSize = 4;
export const kElementIdWithFlagsSize = kElementIdSize + kElementFlagsSize;
export const kRecordSize = 28;
export const kSystemIdSize = 9;

export const ElementFlags = {
    SimpleElement:  0x00000000,
    Room:           0x00000005,
    FamilyType:     0x01000000,
    Level:          0x01000001,
    Stream:         0x01000003,
    System:         0x01000004,
    GenericAsset:   0x01000005
};

export const KeyFlags = {
    Physical:   0x00000000,
    Logical:    0x01000000
};

export const ColumnFamilies = {
    DtProperties:   'z',
    LMV:            '0',
    Source:         'r',
    Standard:       'n',
    Systems:        'm',
    Refs:           'l',
    Xrefs:          'x'
};

export const ColumnNames = {
    BoundingBox:        '0',
    CategoryId:         'c',
    Classification:     'v',
    OClassification:    '!v',
    ElementFlags:       'a',
    Elevation:          'el',
    FamilyType:         't',
    Level:              'l',
    OLevel:             '!l',
    Name:               'n',
    OName:              '!n',
    Parent:             'p',
    Rooms:              'r',
    Settings:           's',
    UniformatClass:     'u',
    TandemCategory:     'z',
    OTandemCategory:    '!z',
};

export const QC = {
    BoundingBox:        `${ColumnFamilies.LMV}:${ColumnNames.BoundingBox}`,
    CategoryId:         `${ColumnFamilies.Standard}:${ColumnNames.CategoryId}`,
    Classification:     `${ColumnFamilies.Standard}:${ColumnNames.Classification}`,
    OClassification:    `${ColumnFamilies.Standard}:${ColumnNames.OClassification}`,
    TandemCategory:     `${ColumnFamilies.Standard}:${ColumnNames.TandemCategory}`,
    OTandemCategory:    `${ColumnFamilies.Standard}:${ColumnNames.OTandemCategory}`,
    ElementFlags:       `${ColumnFamilies.Standard}:${ColumnNames.ElementFlags}`,
    Elevation:          `${ColumnFamilies.Standard}:${ColumnNames.Elevation}`,
    FamilyType:         `${ColumnFamilies.Refs}:${ColumnNames.FamilyType}`,
    Level:              `${ColumnFamilies.Refs}:${ColumnNames.Level}`,
    OLevel:             `${ColumnFamilies.Refs}:${ColumnNames.OLevel}`,
    Name:               `${ColumnFamilies.Standard}:${ColumnNames.Name}`,
    OName:              `${ColumnFamilies.Standard}:${ColumnNames.OName}`,
    Rooms:              `${ColumnFamilies.Refs}:${ColumnNames.Rooms}`,
    Settings:           `${ColumnFamilies.Standard}:${ColumnNames.Settings}`,
    XRooms:             `${ColumnFamilies.Xrefs}:${ColumnNames.Rooms}`,
    XParent:            `${ColumnFamilies.Xrefs}:${ColumnNames.Parent}`,
    Key:                `k`
};

export const ModelState = {
    Ready:          'r',
    Created:        'c',
    ImportPending:  'q',
    Importing:      'i',
    Failed:         'f',
    Translating:    't',
    PostProcessing: 'p',
    Deleted:        'd'
};

export const MutateActions = {
    Delete: 'd',
    DeleteRow: 'a',
    Insert: 'i',
    InsertIfDifferent: 'c'
};

export const AttributeContext = {
    Element: 'e',
    Type: 't',
};

export const AttributeType = {
    Unknown: 0,
    Boolean: 1,
    Integer: 2,
    Double: 3,
    Float: 4,
    String: 20,
    LocalizableString: 21,
    DateTime: 22,
    GeoLocation: 23,
    Position: 24,
    Url: 25,
    StringList: 40
};
