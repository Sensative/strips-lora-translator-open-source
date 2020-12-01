// Copyright (C) 2020, www.sensative.com
//
//  Downlink decoding
//

// Raw data decoder functions
const decodeU32dec = (n) => {
    return n.toString(10);
}

const decodeU32hex = (n) => {
    return 'Ox' + n.toString(16);
}

// Uplink data decoders, not yet completed - in place we replace the raw-translate.js
const ANALOG1 = {
    getsize : (bytes, pos) => 1,
    decode  : (bytes, pos) => bytes[pos],
}
const ANALOG2 = {
    getsize : (bytes, pos) => { return 2; },
    decode  : (bytes, pos) => (bytes[pos++] << 8) + bytes[pos]
}
const ANALOG3 = {
    getsize : (bytes, pos) => 3,
    decode  : (bytes, pos) => (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos]
}
const ANALOG4 = {
    getsize : (bytes, pos) => 4,
    decode  : (bytes, pos) => (bytes[pos++] << 24) + (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos]
}
const DIGITAL = {
    getsize : (bytes, pos) => 1,
    decode  : (bytes, pos) => !!bytes[pos]
}
const GIT_IDD= {
    getsize : (bytes, pos) => 8,
    decode  : (bytes, pos) => { 
        return {
            git: decodeU32hex((bytes[pos++] << 24) + (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos++]),
            idd: decodeU32hex((bytes[pos++] << 24) + (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos++]) }; }
}
const TEMPHUM= {
    getsize : (bytes, pos) => 4,
    decode  : (bytes, pos) => { 
        return { temp: ((bytes[pos++]<<8)+bytes[pos++])/10, hum: ((bytes[pos++]<<8)+bytes[pos++])/2}; }
}
const TEMPDOOR={
    getsize : (bytes, pos) => 3,
    decode  : (bytes, pos) => { 
        return { door: !!bytes[pos++], hum: (bytes[pos++]<<8)+bytes[pos++]}; }
}

// Logical sensors connected to each report, may be used to define products in terms of what sensors are available
const SENSOR = {
    BUTTON:    1<<1,
    BATTERY:   1<<2,
    TEMP:      1<<3,
    HUMID:     1<<4,
    LUX:       1<<5,
    DOOR:      1<<6,
    TAMPER:    1<<7,
    CAP:       1<<8,
    PROX:      1<<9,
}

// All report types including what is required for decode and what sensors are required for each
const STRIPS_REPORTS = {
    UserButton1Alarm:       { reportbit:  0, sensors: SENSOR.BUTTON,               coding: GIT_IDD,  channel: 110 },
    BatteryReport:          { reportbit:  1, sensors: SENSOR.BATTERY,              coding: ANALOG1,  channel: 1   },
    TempReport:             { reportbit:  2, sensors: SENSOR.TEMP,                 coding: ANALOG2,  channel: 2   },
    TempAlarm:              { reportbit:  3, sensors: SENSOR.TEMP,                 coding: ANALOG1,  channel: 3   },
    AverageTempReport:      { reportbit:  4, sensors: SENSOR.TEMP,                 coding: ANALOG2,  channel: 4   },
    AverageTempAlarm:       { reportbit:  5, sensors: SENSOR.TEMP,                 coding: ANALOG1,  channel: 5   },
    HumidityReport:         { reportbit:  6, sensors: SENSOR.HUMID,                coding: ANALOG1,  channel: 6   },
    LuxReport:              { reportbit:  7, sensors: SENSOR.LUX,                  coding: ANALOG2,  channel: 7   },
    LuxReport2:             { reportbit:  8, sensors: SENSOR.LUX,                  coding: ANALOG2,  channel: 8   },
    DoorReport:             { reportbit:  9, sensors: SENSOR.DOOR,                 coding: DIGITAL,  channel: 9   },
    DoorAlarm:              { reportbit: 10, sensors: SENSOR.DOOR,                 coding: DIGITAL,  channel: 10  },
    TamperReport:           { reportbit: 11, sensors: SENSOR.TAMPER,               coding: DIGITAL,  channel: 11  },
    TamperAlarm:            { reportbit: 12, sensors: SENSOR.TAMPER,               coding: DIGITAL,  channel: 12  },
    FloodReport:            { reportbit: 13, sensors: SENSOR.CAP,                  coding: ANALOG1,  channel: 13  },
    FloodAlarm:             { reportbit: 14, sensors: SENSOR.CAP,                  coding: DIGITAL,  channel: 14  },
    FoilAlarm:              { reportbit: 15, sensors: SENSOR.CAP,                  coding: DIGITAL,  channel: 15  },
    TempHumReport:          { reportbit: 16, sensors: SENSOR.TEMP|SENSOR.HUMID,    coding: TEMPHUM,  channel: 80  },
    AvgTempHumReport:       { reportbit: 17, sensors: SENSOR.TEMP|SENSOR.HUMID,    coding: TEMPHUM,  channel: 81  },
    TempDoorReport:         { reportbit: 18, sensors: SENSOR.TEMP|SENSOR.DOOR,     coding: TEMPDOOR, channel: 82  },
    CapacitanceFloodReport: { reportbit: 19, sensors: SENSOR.CAP,                  coding: ANALOG2,  channel: 112 },
    CapacitancePadReport:   { reportbit: 20, sensors: SENSOR.CAP,                  coding: ANALOG2,  channel: 113 },
    CapacitanceEndReport:   { reportbit: 21, sensors: SENSOR.CAP,                  coding: ANALOG2,  channel: 114 },
    UserSwitch1Alarm:       { reportbit: 22, sensors: SENSOR.TAMPER,               coding: DIGITAL,  channel: 16  },
    DoorCountReport:        { reportbit: 23, sensors: SENSOR.TAMPER,               coding: ANALOG2,  channel: 17  },
    PresenceReport:         { reportbit: 24, sensors: SENSOR.PROX,                 coding: DIGITAL,  channel: 18  },
    IRProximityReport:      { reportbit: 25, sensors: SENSOR.PROX,                 coding: ANALOG2,  channel: 19  },
    IRLProximityReport:     { reportbit: 26, sensors: SENSOR.PROX,                 coding: ANALOG2,  channel: 20  },
    CloseProximitySensor:   { reportbit: 27, sensors: SENSOR.PROX,                 coding: DIGITAL,  channel: 21  },
    DisinfectSensor:        { reportbit: 28, sensors: SENSOR.PROX,                 coding: ANALOG1,  channel: 22  },
}


const decodeReports = (n) => {
    let result = new Object();
    result['reportbits'] = decodeU32hex(n);
    for (var report in STRIPS_REPORTS) {
        if (n & (1 << STRIPS_REPORTS[report].reportbit))
            result[report] = STRIPS_REPORTS[report];
    }
    return result;
}

const decodeConfig = (n) => {
    let r = '';
    if ((n & 1) != 0)
        r+= 'Invert door|';
    if ((n & 2) != 0)
        r+= 'High power proximity|';
    return r;
}


// Settings metadata
const STRIPS_SETTINGS = {
    NONE                              : { id: 0x00, unit: 'none',           decode: decodeU32hex,  name:'None'  },
    VERSION                           : { id: 0x01, unit: 'version',        decode: decodeU32hex,  name:'Version'  },
    BASE_POLL_INTERVAL                : { id: 0x02, unit: 'ms',             decode: decodeU32dec,  name:'Base poll interval'  },
    REPORTS_ENABLED                   : { id: 0x03, unit: 'reports',        decode: decodeReports, name:'Reports enabled'  },
    TEMP_POLL_INTERVAL                : { id: 0x04, unit: 's',              decode: decodeU32dec,  name:'Temp poll interval'  },
    TEMP_SEND_IMMEDIATELY_TRESHOLD    : { id: 0x05, unit: 'mC',             decode: decodeU32dec,  name:'Temp send immediately treshold'  },
    TEMP_SEND_THROTTLED_TRESHOLD      : { id: 0x06, unit: 'mC',             decode: decodeU32dec,  name:'Temp send throttled treshold'  },
    TEMP_SEND_THROTTLED_TIME          : { id: 0x07, unit: 's',              decode: decodeU32dec,  name:'Temp send throttled time'  },
    TEMP_LOW_ALARM                    : { id: 0x08, unit: 'mC',             decode: decodeU32dec,  name:'Temp low alarm'  },
    TEMP_HIGH_ALARM                   : { id: 0x09, unit: 'mC',             decode: decodeU32dec,  name:'Temp high alarm'  },
    TEMP_ALARM_HYSTERESIS             : { id: 0x0A, unit: 'mC',             decode: decodeU32dec,  name:'Temp alarm hysteresis'  },
    AVGTEMP_AVERAGE_TIME              : { id: 0x0B, unit: 's',              decode: decodeU32dec,  name:'Average temp average time'  },
    AVGTEMP_MIN_TEMP                  : { id: 0x0C, unit: 'mC',             decode: decodeU32dec,  name:'Average temp min temp'  },
    AVGTEMP_SEND_IMMEDIATELY_TRESHOLD : { id: 0x0D, unit: 'mC',             decode: decodeU32dec,  name:'Averate temp send immediately treshold'  },
    AVGTEMP_LOW_ALARM                 : { id: 0x0E, unit: 'mC',             decode: decodeU32dec,  name:'Average temp low alarm'  },
    AVGTEMP_HIGH_ALARM                : { id: 0x0F, unit: 'mC',             decode: decodeU32dec,  name:'Average temp high alarm'  },
    AVGTEMP_ALARM_HYSTERESIS          : { id: 0x10, unit: 'mC',             decode: decodeU32dec,  name:'Average temp hysteresis'  },
    HUMIDITY_POLL_INTERVAL            : { id: 0x11, unit: 's',              decode: decodeU32dec,  name:'Humidity poll interval'  },
    HUMIDITY_TRESHOLD                 : { id: 0x12, unit: '%',              decode: decodeU32dec,  name:'Humidity treshold'  },
    LUX_POLL_INTERVAL                 : { id: 0x13, unit: 's',              decode: decodeU32dec,  name:'Lux poll interval'  },
    LUX_HIGH_LEVEL_1                  : { id: 0x14, unit: 'Lux',            decode: decodeU32dec,  name:'Lux high level 1'  },
    LUX_LOW_LEVEL_1                   : { id: 0x15, unit: 'Lux',            decode: decodeU32dec,  name:'Lux low level 1'  },
    LUX_HIGH_LEVEL_2                  : { id: 0x16, unit: 'Lux',            decode: decodeU32dec,  name:'Lux high level 2'  },
    LUX_LOW_LEVEL_2                   : { id: 0x17, unit: 'Lux',            decode: decodeU32dec,  name:'Lux low level 2'  },
    FLOOD_POLL_INTERVAL               : { id: 0x18, unit: 's',              decode: decodeU32dec,  name:'Flood poll interval'  },
    FLOOD_CAPACITANCE_MIN             : { id: 0x19, unit: 'capacitance',    decode: decodeU32dec,  name:'Flood capacitance min'  },
    FLOOD_CAPACITANCE_MAX             : { id: 0x1A, unit: 'capacitance',    decode: decodeU32dec,  name:'Flood capacitance max'  },
    FLOOD_REPORT_INTERVAL             : { id: 0x1B, unit: 's',              decode: decodeU32dec,  name:'Flood report interval'  },
    FLOOD_ALARM_TRESHOLD              : { id: 0x1C, unit: '%',              decode: decodeU32dec,  name:'Flood alarm treshold'  },
    FLOOD_ALARM_HYSTERESIS            : { id: 0x1D, unit: '%',              decode: decodeU32dec,  name:'Flood alarm hysteresis'  },
    SETTINGS_FOIL_TRESHOLD            : { id: 0x1E, unit: 'capacitance',    decode: decodeU32dec,  name:'Foil treshold'  },
    CAPACITANCE_FLOOD_REPORT_INTERVAL : { id: 0x1F, unit: 's',              decode: decodeU32dec,  name:'Cap flood report interval'  },
    CAPACITANCE_PAD_REPORT_INTERVAL   : { id: 0x20, unit: 's',              decode: decodeU32dec,  name:'Cap pad report interval'  },
    CAPACITANCE_END_REPORT_INTERVAL   : { id: 0x21, unit: 's',              decode: decodeU32dec,  name:'Cap end report interval'  },
    SENSORS_COMBINED_1                : { id: 0x22, unit: 'reports',        decode: decodeReports, name:'Combined sensors 1'  },
    SENSORS_COMBINED_2                : { id: 0x23, unit: 'reports',        decode: decodeReports, name:'Combined sensors 2'  },
    SENSORS_COMBINED_3                : { id: 0x24, unit: 'reports',        decode: decodeReports, name:'Combined sensors 3'  },
    HISTORY_REPORTS                   : { id: 0x25, unit: 'reports',        decode: decodeReports, name:'History reports'  },
    DEMO_TRYJOIN_INTERVAL             : { id: 0x26, unit: 'min',            decode: decodeU32dec,  name:'Try join interval'  },
    LUX_PLASTIC_COMP                  : { id: 0x27, unit: '%',              decode: decodeU32dec,  name:'Lux plastic comp'  },
    LORA_DATA_RATE                    : { id: 0x28, unit: 'datarate',       decode: decodeU32dec,  name:'Lora data rate'  },
    LED_LEVEL                         : { id: 0x29, unit: 'ledlevel',       decode: decodeU32dec,  name:'Led level'  },
    LINK_CHECK_INTERVAL               : { id: 0x2A, unit: 'unknown',        decode: decodeU32dec,  name:'Link check interval'  },
    RESEND_RESET_TIME                 : { id: 0x2B, unit: 'unknown',        decode: decodeU32dec,  name:'Resend reset time'  },
    LUX_LOW_CUTOFF                    : { id: 0x2C, unit: 'lux',            decode: decodeU32dec,  name:'Lux low cutoff'  },
    DOOR_COUNT_REPORT_INTERVAL        : { id: 0x2D, unit: 's',              decode: decodeU32dec,  name:'Door count interval'  },
    IR_PROXIMITY_REPORT_INTERVAL      : { id: 0x2E, unit: 's',              decode: decodeU32dec,  name:'IR Proximity report interval'  },
    PRESENCE_POLL_INTERVAL            : { id: 0x2F, unit: 's',              decode: decodeU32dec,  name:'Presence poll interval'  },
    PRESENCE_TRESHOLD                 : { id: 0x30, unit: 'reflection',     decode: decodeU32dec,  name:'Presence treshold'  },
    PRESENCE_TIMEOUT                  : { id: 0x31, unit: 's',              decode: decodeU32dec,  name:'Presence timeout'  },
    SENSOR_CONFIGURATION              : { id: 0x32, unit: 'config',         decode: decodeConfig,  name:'Sensor configuration'  },
}

const STRIPS_PROFILES = {
    DEFAULT              : { id: 0x00, name: 'Default' },
    COMFORT_TEMP         : { id: 0x01, name: 'Comfort Temp' },
    COMFORT_TEMP_LUX     : { id: 0x02, name: 'Comfort Temp and Lux' },
    COMFORT_AVGTEMP      : { id: 0x03, name: 'Comfort Average Temp' },
    GUARD_STD            : { id: 0x04, name: 'Guard Standard' },
    DRIP_STD             : { id: 0x05, name: 'Drip Standard' },
    PRESENCE_OFFICE      : { id: 0x06, name: 'Presence Office' },
    PRESENCE_PUBLIC      : { id: 0x07, name: 'Presence Public' },
    DISINFECT_OFFICE     : { id: 0x08, name: 'Disinfect Office' },
    CLOSE_PROXIMITY_SLOW : { id: 0x09, name: 'Close Proximity Slow' },
    ALL_CAP_SENSORS_RAW  : { id: 0xF0, name: 'All cap sensors raw' },
}



function decodeSetSetting(bytes, pos) {
    var result = new Object();
    if (pos == bytes.end)
        throw {message: "No settings to set"};

    while (pos < bytes.length) {
        if (bytes.length < pos + 5)
            throw {message: "Set settings: Bad data size"}
        const id = bytes[pos++];
        const val = (bytes[pos++] << 24) + (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos++];
        let bFound = false;
        for (var setting in STRIPS_SETTINGS) {
            if (STRIPS_SETTINGS[setting].id == id) {
                bFound = true;
                result[setting] = {id:id, name: STRIPS_SETTINGS[setting].name, unit: STRIPS_SETTINGS[setting].unit, value: STRIPS_SETTINGS[setting].decode(val)}
            }
        }
        if (false == bFound)
            throw {message:"Unknown setting: " + id};
    }
    return result;
}

function decodeGetSetting(bytes, pos) {
    let result = new Object();
    while (pos < bytes.length) {
        const id = bytes[pos++];
        let bFound = false;
        for (var setting in STRIPS_SETTINGS) {
            if (STRIPS_SETTINGS[setting].id == id) {
                result[setting] = {id:id, name: setting, unit:STRIPS_SETTINGS[setting].unit}
                bFound = true;
                break;
            }
        }
        if (false == bFound)
            throw {message: "Get settings: Unknown setting " + id};
    }
    return result;
}

// 2 bytes first, 2 bytes last history sequence number
function decodeGetHistory(bytes, pos) {
    if (bytes.length != 5)
        throw {message: 'Get history command: Bad package size'}
    const first = (bytes[pos++] << 8) + bytes[pos++];
    const last  = (bytes[pos++] << 8) + bytes[pos++];
    return {first:first, last:last, unit:'History sequence number'};
}

function decodeSetProfile(bytes, pos) {
    if (bytes.length != 2)
        throw {message: 'Set profile command: Bad package size'}
    const profile = bytes[pos++];
    for (var id in STRIPS_PROFILES)
        if (STRIPS_PROFILES[id].id == profile)
            return {profile: STRIPS_PROFILES[id].name}
    throw {message: 'Set profile: Unknown profile ' + profile}
}

function decodeCmdUnjoin(bytes, pos) {
    if (bytes.length != 3)
        throw {message: 'Unjoin command: Bad package size'}
    const minutes = (bytes[pos++] << 8) + bytes[pos++];
    return {minutes: minutes};
} 

function decodeEndComp(bytes, pos) {
    if (2 != bytes.length)
        throw {message: 'End compliance test: Bad package size'}
    return {kind: 'End compliance test'};
}

const STRIPS_PORTCOMMANDS = {
    SET_SETTING : { port: 11,  cmd: 1, decode: decodeSetSetting, kind: 'Set setting'},
    GET_SETTING : { port: 11,  cmd: 2, decode: decodeGetSetting, kind: 'Get setting'},
    GET_HISTORY : { port: 2,   cmd: 1, decode: decodeGetHistory, kind: 'Get history'},
    SET_PROFILE : { port: 10,  cmd: 1, decode: decodeSetProfile, kind: 'Set profile'},
    CMD_UNJOIN  : { port: 10,  cmd: 8, decode: decodeCmdUnjoin,  kind: 'Unjoin'},
    CMD_ENDCOMP : { port: 224, cmd: 6, decode: decodeEndComp,    kind: 'End compliance test'},
}

// Either return a structure representing the downlink, or throw an error with message corresponding to the problem
function decodeLoraStripsDownlink(port, bytes) {
    if (bytes == null || bytes.length < 2)
        throw { message: 'Not enough data'};
    const cmd = bytes[0];
    for (var id in STRIPS_PORTCOMMANDS) {
        if (STRIPS_PORTCOMMANDS[id].port == port && STRIPS_PORTCOMMANDS[id].cmd == cmd) {
            let result  = STRIPS_PORTCOMMANDS[id].decode(bytes, 1);
            result['kind'] = STRIPS_PORTCOMMANDS[id].kind;
            return result;
        }
    }
    throw { message: 'Unrecognized downlink'};
}

// Test code follows
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function test() {
    rl.question('Enter port (decimal): ', (port) => {
        port = Number(port);
        rl.question('Enter downlink (hex format): ', (answer) => { 
            try {
                let data = Buffer.from(answer, "hex");
                console.log(JSON.stringify(decodeLoraStripsDownlink(port, data)))
            } catch (err) { console.log(err.message); }
            test(); // Bad tail recursion
        })
    })
}

test();
