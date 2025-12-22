/**
 * @type { Production: "prod"; Staging: "stg" }
 */
export const Environment = {
    Production: 'prod',
    Staging: 'stg'
};

/**
 * @type { US: "US"; EMEA: "EMEA"; AUS: "AUS" }
 */
export const Region = {
    US: 'US',
    EMEA: 'EMEA',
    AUS: 'AUS'
};

export const RegionLabelMap = {
    'us': Region.US,
    'eu': Region.EMEA,
    'aus': Region.AUS
};

export const kModelIdSize = 16;
export const kElementIdSize = 20;
export const kElementFlagsSize = 4;
export const kElementIdWithFlagsSize = kElementIdSize + kElementFlagsSize;
export const kRecordSize = 28;
export const kSystemIdSize = 9;

// current version of classification schema
export const SchemaVersion = 2;

export const ElementFlags = {
    SimpleElement:  0x00000000,
    Room:           0x00000005,
    FamilyType:     0x01000000,
    Level:          0x01000001,
    Stream:         0x01000003,
    System:         0x01000004,
    GenericAsset:   0x01000005,
    Collection:     0x01000006,
    Ticket:         0x01000007,
    AllLogicalMask: 0xff000000,
    Deleted:        0xfffffffe
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
    Priority:           'pr',
    OpenDate:           'od',
    CloseDate:          'cd',
    Rooms:              'r',
    ORooms:             '!r',
    Settings:           's',
    SystemClass:        'b',
    OSystemClass:       '!b',
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
    Priority:           `${ColumnFamilies.Standard}:${ColumnNames.Priority}`,
    OpenDate:           `${ColumnFamilies.Standard}:${ColumnNames.OpenDate}`,
    CloseDate:          `${ColumnFamilies.Standard}:${ColumnNames.CloseDate}`,
    Rooms:              `${ColumnFamilies.Refs}:${ColumnNames.Rooms}`,
    Settings:           `${ColumnFamilies.Standard}:${ColumnNames.Settings}`,
    SystemClass:        `${ColumnFamilies.Standard}:${ColumnNames.SystemClass}`,
    OSystemClass:       `${ColumnFamilies.Standard}:${ColumnNames.OSystemClass}`,
    XRooms:             `${ColumnFamilies.Xrefs}:${ColumnNames.Rooms}`,
    OXRooms:            `${ColumnFamilies.Xrefs}:${ColumnNames.ORooms}`,
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
    // special types
    BLOB: 10,
    DbKey: 11,
    DbKeyList: 12,
    ExDbKeyList: 13,
    String: 20,
    LocalizableString: 21,
    DateTime: 22, /* ISO 8601 date */
    GeoLocation: 23, /* LatLonHeight - ISO 6709 Annex H string */
    Position: 24, /* "x y z w" - space separated string with 2,3 or 4 values */
    Url: 25,
    StringList: 40 /* Tag */
};

export const SystemClassNames = [
    "Supply Air",                   //0
    "Return Air",                   //1
    "Exhaust Air",                  //2
    "Hydronic Supply",              //3
    "Hydronic Return",              //4
    "Domestic Hot Water",           //5
    "Domestic Cold Water",          //6
    "Sanitary",                     //7
    "Power",                        //8
    "Vent",                         //9
    "Controls",                     //10
    "Fire Protection Wet",          //11
    "Fire Protection Dry",          //12
    "Fire Protection Pre-Action",   //13
    "Other Air",                    //14
    "Other",                        //15
    "Fire Protection Other",        //16
    "Communication",                //17
    "Data Circuit",                 //18
    "Telephone",                    //19
    "Security",                     //20
    "Fire Alarm",                   //21
    "Nurse Call",                   //22
    "Switch Topology",              //23
    "Cable Tray Conduit",           //24
    "Storm",                        //25
];

// history related constants
export const HC = {
   ClientID: 'c',
   CorrelationID: 'i',
   Description: 'd',
   Keys: 'k',
   Operation: 'o',
   Timestamp: 't',
   Username: 'n'
};
