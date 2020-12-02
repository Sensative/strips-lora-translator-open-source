// Copyright (C) 2020, www.sensative.com
//
//  Downlink decoding and encoding for Sensative Lora Strips
//

// Raw data decoder functions
const decodeU32dec = (n) => {
    return n.toString(10);
}

const decodeU32hex = (n) => {
    return 'Ox' + n.toString(16);
}

function d2h(d, bytes) {
    const size = bytes * 2;
    var hex = Number(d).toString(16);
    if (hex.length > size)
        hex = hex.substring(hex.length-size);
    while (hex.length < size)
        hex = '0' + hex;
    return hex;
}

const encodeU32hex = (value) => {
    const n = parseInt(value.substring(2), 16);
    return d2h(n, 4);
}

const encodeU32 = (value) => {
    return d2h(value, 4);
}

// Uplink data decoders, not yet completed - in case we replace the raw-translate.js
const UNSIGN1 = {
    name    : '1 byte',
    getsize : (bytes, pos) => 1,
    decode  : (bytes, pos) => bytes[pos],
}
const UNS1FP2 = {
    name    : UNSIGN1.name + " fp .5",
    getsize : (bytes, pos) => UNSIGN1.getsize(bytes, pos),
    decode  : (bytes, pos) => UNSIGN1.decode(bytes, pos) / 2,
}
const UNSIGN2 = {
    name    : '2 bytes little endian unsigned',
    getsize : (bytes, pos) => { return 2; },
    decode  : (bytes, pos) => (bytes[pos++] << 8) + bytes[pos]
}
const SIGNED2 = {
    name    : '2 bytes little endian signed',
    getsize : (bytes, pos) => 2,
    decode  : (bytes, pos) => ((bytes[pos] & 0x80 ? 0xFFFF<<16 : 0) | (bytes[pos++] << 8) | bytes[pos++])
}
const SI2FP10 = {
    name    : SIGNED2.name + ' fp .1',
    getsize : (bytes, pos) => SIGNED2.getsize(bytes, pos),
    decode  : (bytes, pos) => SIGNED2.decode(bytes, pos)/10
}
const TMPALRM = {
    name    : 'Tmp alarm',
    getsize : (bytes, pos) => 1,
    decode  : (bytes, pos) => { return {high: !!(bytes[pos] & 0x01), low: !!(bytes[pos] & 0x02)}; }
}
const DIGITAL = {
    name    : '1 byte boolean',
    getsize : (bytes, pos) => 1,
    decode  : (bytes, pos) => !!bytes[pos]
}
const GIT_IDD = {
    name    : 'Git revision and debug data',
    getsize : (bytes, pos) => 8,
    decode  : (bytes, pos) => { 
        return {
            git: d2h((bytes[pos++] << 24) + (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos++], 4),
            idd: d2h((bytes[pos++] << 24) + (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos++], 4) }; }
}
const TEMPHUM = {
    name    : 'Temp and humidity combined',
    getsize : (bytes, pos) => UNS1FP2.getsize(bytes, pos) + SI2FP10.getsize(bytes, pos+1),
    decode  : (bytes, pos) => { return { humidity: { value: UNS1FP2(bytes, pos), unit:'%'}, temp: {value: SI2FP10(bytes, pos+1), unit: 'C'}} ; }
}

const TEMPDOR = {
    name    : 'Temp and door combined',
    getsize : (bytes, pos) => 3,
    decode  : (bytes, pos) => { return { door: {value: DIGITAL.decode(bytes, pos), unit: 'bool'}, temp: { value: SI2FP10(bytes, pos+1), unit: 'C'}}; }
}

// Logical sensors connected to each report, may be used to define products in terms of what sensors are available
// and inversely, only select relevant setttings for a given product.
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
    UserButton1Alarm:       { reportbit:  0, sensors: SENSOR.BUTTON,            coding: (b,p)=>{ return {value: GIT_IDD(b,p), unit:'data'}},  channel: 110 },
    BatteryReport:          { reportbit:  1, sensors: SENSOR.BATTERY,           coding: (b,p)=>{ return {value: UNSIGN1(b,p), unit:'%'   }},  channel: 1   },
    TempReport:             { reportbit:  2, sensors: SENSOR.TEMP,              coding: (b,p)=>{ return {value: SI2FP10(b,p), unit:'C'   }},  channel: 2   },
    TempAlarm:              { reportbit:  3, sensors: SENSOR.TEMP,              coding: (b,p)=>{ return {value: TMPALRM(b,p), unit:'pair'}},  channel: 3   },
    AverageTempReport:      { reportbit:  4, sensors: SENSOR.TEMP,              coding: (b,p)=>{ return {value: SI2FP10(b,p), unit:'C'   }},  channel: 4   },
    AverageTempAlarm:       { reportbit:  5, sensors: SENSOR.TEMP,              coding: (b,p)=>{ return {value: TMPALRM(b,p), unit:'pair'}},  channel: 5   },
    HumidityReport:         { reportbit:  6, sensors: SENSOR.HUMID,             coding: (b,p)=>{ return {value: UNS1FP2(b,p), unit:'%'   }},  channel: 6   },
    LuxReport:              { reportbit:  7, sensors: SENSOR.LUX,               coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'Lux' }},  channel: 7   },
    LuxReport2:             { reportbit:  8, sensors: SENSOR.LUX,               coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'Lux' }},  channel: 8   },
    DoorReport:             { reportbit:  9, sensors: SENSOR.DOOR,              coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 9   },
    DoorAlarm:              { reportbit: 10, sensors: SENSOR.DOOR,              coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 10  },
    TamperReport:           { reportbit: 11, sensors: SENSOR.TAMPER,            coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 11  },
    TamperAlarm:            { reportbit: 12, sensors: SENSOR.TAMPER,            coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 12  },
    FloodReport:            { reportbit: 13, sensors: SENSOR.CAP,               coding: (b,p)=>{ return {value: UNSIGN1(b,p), unit:'%'   }},  channel: 13  },
    FloodAlarm:             { reportbit: 14, sensors: SENSOR.CAP,               coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 14  },
    FoilAlarm:              { reportbit: 15, sensors: SENSOR.CAP,               coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 15  },
    TempHumReport:          { reportbit: 16, sensors: SENSOR.TEMP|SENSOR.HUMID, coding: (b,p)=>TEMPHUM(b,p),                                  channel: 80  },
    AvgTempHumReport:       { reportbit: 17, sensors: SENSOR.TEMP|SENSOR.HUMID, coding: (b,p)=>TEMPHUM(b,p),                                  channel: 81  },
    TempDoorReport:         { reportbit: 18, sensors: SENSOR.TEMP|SENSOR.DOOR,  coding: (b,p)=>TEMPDOR(b,p),                                  channel: 82  },
    CapacitanceFloodReport: { reportbit: 19, sensors: SENSOR.CAP,               coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'uF'  }},  channel: 112 },
    CapacitancePadReport:   { reportbit: 20, sensors: SENSOR.CAP,               coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'uF'  }},  channel: 113 },
    CapacitanceEndReport:   { reportbit: 21, sensors: SENSOR.CAP,               coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'uF'  }},  channel: 114 },
    UserSwitch1Alarm:       { reportbit: 22, sensors: SENSOR.TAMPER,            coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 16  },
    DoorCountReport:        { reportbit: 23, sensors: SENSOR.TAMPER,            coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'u16' }},  channel: 17  },
    PresenceReport:         { reportbit: 24, sensors: SENSOR.PROX,              coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 18  },
    IRProximityReport:      { reportbit: 25, sensors: SENSOR.PROX,              coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'u16' }},  channel: 19  },
    IRCloseProximityReport: { reportbit: 26, sensors: SENSOR.PROX,              coding: (b,p)=>{ return {value: UNSIGN2(b,p), unit:'u16' }},  channel: 20  },
    CloseProximityAlarm:    { reportbit: 27, sensors: SENSOR.PROX,              coding: (b,p)=>{ return {value: DIGITAL(b,p), unit:'bool'}},  channel: 21  },
    DisinfectAlarm:         { reportbit: 28, sensors: SENSOR.PROX,              coding: (b,p)=>{ return {value: UNSIGN1(b,p), unit:'enum'}},  channel: 22  },
}


const decodeReports = (n) => {
    let result = '';
    for (var report in STRIPS_REPORTS) {
        if (n & (1 << STRIPS_REPORTS[report].reportbit)) {
            if (result != '')
                result += '|';
            result += report;
        }
    }
    return result;
}

const encodeReports = (str) => {
    const list = str.split('|');
    let res = 0;
    list.map((item) => {
        if (item.length > 0) {
            if (!STRIPS_REPORTS.hasOwnProperty(item))
                throw {message:'Invalid report id: ' + item};
            res |= (1<<STRIPS_REPORTS[item].reportbit)
        }
    });
    return d2h(res, 4);
}

const SENSOR_CONFIG_BITS = {
    INVERT_DOOR:            (1<<0),
    HIGH_POWER_PROXIMITY:   (1<<1),
}

const decodeConfig = (n) => {
    let r = '';
    for (let bitname in SENSOR_CONFIG_BITS)
        if (n & SENSOR_CONFIG_BITS[bitname]) {
            if (r!='') r+='|';
            r+=bitname;
        }
    return r;
}

const encodeConfig = (str) => {
    const list = str.split('|');
    let res = 0;
    list.map((item) => {
        for (let bitname in SENSOR_CONFIG_BITS) {
            if (item == bitname)
                res |= SENSOR_CONFIG_BITS[bitname];
        }
    });
    return d2h(res, 4);
}

// Settings metadata
const STRIPS_SETTINGS = {
    NONE                              : { id: 0x00, unit: 'none',        decode: decodeU32hex,  encode: encodeU32hex,  name:'None'},
    VERSION                           : { id: 0x01, unit: 'version',     decode: decodeU32hex,  encode: encodeU32hex,  name:'Version'  },
    BASE_POLL_INTERVAL                : { id: 0x02, unit: 'ms',          decode: decodeU32dec,  encode: encodeU32,     name:'Base poll interval'  },
    REPORTS_ENABLED                   : { id: 0x03, unit: 'reports',     decode: decodeReports, encode: encodeReports, name:'Reports enabled'},
    TEMP_POLL_INTERVAL                : { id: 0x04, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Temp poll interval'  },
    TEMP_SEND_IMMEDIATELY_TRESHOLD    : { id: 0x05, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Temp send immediately treshold'  },
    TEMP_SEND_THROTTLED_TRESHOLD      : { id: 0x06, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Temp send throttled treshold'  },
    TEMP_SEND_THROTTLED_TIME          : { id: 0x07, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Temp send throttled time'  },
    TEMP_LOW_ALARM                    : { id: 0x08, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Temp low alarm'  },
    TEMP_HIGH_ALARM                   : { id: 0x09, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Temp high alarm'  },
    TEMP_ALARM_HYSTERESIS             : { id: 0x0A, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Temp alarm hysteresis' },
    AVGTEMP_AVERAGE_TIME              : { id: 0x0B, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Average temp average time' },
    AVGTEMP_MIN_TEMP                  : { id: 0x0C, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Average temp min temp'  },
    AVGTEMP_SEND_IMMEDIATELY_TRESHOLD : { id: 0x0D, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Averate temp send immediately treshold'  },
    AVGTEMP_LOW_ALARM                 : { id: 0x0E, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Average temp low alarm'  },
    AVGTEMP_HIGH_ALARM                : { id: 0x0F, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Average temp high alarm'  },
    AVGTEMP_ALARM_HYSTERESIS          : { id: 0x10, unit: 'mC',          decode: decodeU32dec,  encode: encodeU32,     name:'Average temp hysteresis'  },
    HUMIDITY_POLL_INTERVAL            : { id: 0x11, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Humidity poll interval'  },
    HUMIDITY_TRESHOLD                 : { id: 0x12, unit: '%',           decode: decodeU32dec,  encode: encodeU32,     name:'Humidity treshold'  },
    LUX_POLL_INTERVAL                 : { id: 0x13, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Lux poll interval'  },
    LUX_HIGH_LEVEL_1                  : { id: 0x14, unit: 'Lux',         decode: decodeU32dec,  encode: encodeU32,     name:'Lux high level 1'  },
    LUX_LOW_LEVEL_1                   : { id: 0x15, unit: 'Lux',         decode: decodeU32dec,  encode: encodeU32,     name:'Lux low level 1'  },
    LUX_HIGH_LEVEL_2                  : { id: 0x16, unit: 'Lux',         decode: decodeU32dec,  encode: encodeU32,     name:'Lux high level 2'  },
    LUX_LOW_LEVEL_2                   : { id: 0x17, unit: 'Lux',         decode: decodeU32dec,  encode: encodeU32,     name:'Lux low level 2'  },
    FLOOD_POLL_INTERVAL               : { id: 0x18, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Flood poll interval'  },
    FLOOD_CAPACITANCE_MIN             : { id: 0x19, unit: 'capacitance', decode: decodeU32dec,  encode: encodeU32,     name:'Flood capacitance min'  },
    FLOOD_CAPACITANCE_MAX             : { id: 0x1A, unit: 'capacitance', decode: decodeU32dec,  encode: encodeU32,     name:'Flood capacitance max'  },
    FLOOD_REPORT_INTERVAL             : { id: 0x1B, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Flood report interval'  },
    FLOOD_ALARM_TRESHOLD              : { id: 0x1C, unit: '%',           decode: decodeU32dec,  encode: encodeU32,     name:'Flood alarm treshold'  },
    FLOOD_ALARM_HYSTERESIS            : { id: 0x1D, unit: '%',           decode: decodeU32dec,  encode: encodeU32,     name:'Flood alarm hysteresis'  },
    SETTINGS_FOIL_TRESHOLD            : { id: 0x1E, unit: 'capacitance', decode: decodeU32dec,  encode: encodeU32,     name:'Foil treshold'  },
    CAPACITANCE_FLOOD_REPORT_INTERVAL : { id: 0x1F, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Cap flood report interval'  },
    CAPACITANCE_PAD_REPORT_INTERVAL   : { id: 0x20, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Cap pad report interval'  },
    CAPACITANCE_END_REPORT_INTERVAL   : { id: 0x21, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Cap end report interval'  },
    SENSORS_COMBINED_1                : { id: 0x22, unit: 'reports',     decode: decodeReports, encode: encodeReports, name:'Combined sensors 1'  },
    SENSORS_COMBINED_2                : { id: 0x23, unit: 'reports',     decode: decodeReports, encode: encodeReports, name:'Combined sensors 2' },
    SENSORS_COMBINED_3                : { id: 0x24, unit: 'reports',     decode: decodeReports, encode: encodeReports, name:'Combined sensors 3' },
    HISTORY_REPORTS                   : { id: 0x25, unit: 'reports',     decode: decodeReports, encode: encodeReports, name:'History reports' },
    DEMO_TRYJOIN_INTERVAL             : { id: 0x26, unit: 'min',         decode: decodeU32dec,  encode: encodeU32,     name:'Try join interval'  },
    LUX_PLASTIC_COMP                  : { id: 0x27, unit: '%',           decode: decodeU32dec,  encode: encodeU32,     name:'Lux plastic comp'  },
    LORA_DATA_RATE                    : { id: 0x28, unit: 'datarate',    decode: decodeU32dec,  encode: encodeU32,     name:'Lora data rate'  },
    LED_LEVEL                         : { id: 0x29, unit: 'ledlevel',    decode: decodeU32dec,  encode: encodeU32,     name:'Led level'  },
    LINK_CHECK_INTERVAL               : { id: 0x2A, unit: 'unknown',     decode: decodeU32dec,  encode: encodeU32,     name:'Link check interval'  },
    RESEND_RESET_TIME                 : { id: 0x2B, unit: 'unknown',     decode: decodeU32dec,  encode: encodeU32,     name:'Resend reset time'  },
    LUX_LOW_CUTOFF                    : { id: 0x2C, unit: 'lux',         decode: decodeU32dec,  encode: encodeU32,     name:'Lux low cutoff'  },
    DOOR_COUNT_REPORT_INTERVAL        : { id: 0x2D, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Door count interval'  },
    IR_PROXIMITY_REPORT_INTERVAL      : { id: 0x2E, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'IR Proximity report interval'  },
    PRESENCE_POLL_INTERVAL            : { id: 0x2F, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Presence poll interval'  },
    PRESENCE_TRESHOLD                 : { id: 0x30, unit: 'reflection',  decode: decodeU32dec,  encode: encodeU32,     name:'Presence treshold'  },
    PRESENCE_TIMEOUT                  : { id: 0x31, unit: 's',           decode: decodeU32dec,  encode: encodeU32,     name:'Presence timeout'  },
    SENSOR_CONFIGURATION              : { id: 0x32, unit: 'config',      decode: decodeConfig,  encode: encodeConfig,  name:'Sensor configuration'},
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

// Encode settings, ignore fields that are not same as a particular setting name
function encodeSetSetting(obj) {
    var res = '';
    for (var field in obj)
        if (STRIPS_SETTINGS.hasOwnProperty(field))
            res += d2h(STRIPS_SETTINGS[field].id,1) + STRIPS_SETTINGS[field].encode(obj[field].value);
    return res;
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

// Assume object has a number of fields names corresponding to STRIPS_SETTINGS fields. 
// Ignores fields that do not have corresponding setting
function encodeGetSetting(obj) {
    let res = '';
    for (var field in obj)
        for (var setting in STRIPS_SETTINGS)
            if (field == setting) {
                res += d2h(STRIPS_SETTINGS[setting].id, 1);
                continue;
            }
    return res;
}

// 2 bytes first, 2 bytes last history sequence number
function decodeGetHistory(bytes, pos) {
    if (bytes.length != 5)
        throw {message: 'Get history command: Bad package size'}
    const first = (bytes[pos++] << 8) + bytes[pos++];
    const last  = (bytes[pos++] << 8) + bytes[pos++];
    return {first:first, last:last, unit:'History sequence number'};
}

function encodeGetHistory(obj) {
    if (false == obj.hasOwnProperty('first') || false == obj.hasOwnProperty('last'))
        throw {message:'Expected properties first and last missing'}
    return d2h(obj.first,2) + d2h(obj.last,2);
}


function decodeSetProfile(bytes, pos) {
    if (bytes.length != 2)
        throw {message: 'Set profile command: Bad package size'}
    const profile = bytes[pos++];
    for (var id in STRIPS_PROFILES)
        if (STRIPS_PROFILES[id].id == profile)
            return {profile: STRIPS_PROFILES[id].name, id:id}
    throw {message: 'Unknown profile ' + profile}
}

// Checks profile ID
function encodeSetProfile(obj) {
    if (false == obj.hasOwnProperty('id'))
        throw {message:'Profile id is missing'};
    const profile = obj.id;
    if (false == STRIPS_PROFILES.hasOwnProperty(profile))
        throw {message:'Unknown profile ' + profile};
    return d2h(STRIPS_PROFILES[profile].id, 1);
}

function decodeCmdUnjoin(bytes, pos) {
    if (bytes.length != 3)
        throw {message: 'Unjoin command: Bad package size'}
    const minutes = (bytes[pos++] << 8) + bytes[pos++];
    return {minutes: minutes};
} 

function encodeCmdUnjoin(obj) {
    if (false == obj.hasOwnProperty('minutes'))
        throw {message: 'Unjoin requires minutes field'};
    return d2h(obj.minutes, 2);
}

function decodeEndComp(bytes, pos) {
    if (1 != bytes.length)
        throw {message: 'End compliance test: Bad package size'}
    return {};
}

// No data for this command
function encodeEndComp(obj) {
    return '';
}

const STRIPS_PORTCOMMANDS = {
    SET_SETTING : { port: 11,  cmd: 1, decode: decodeSetSetting, encode: encodeSetSetting, name: 'Set setting'          },
    GET_SETTING : { port: 11,  cmd: 2, decode: decodeGetSetting, encode: encodeGetSetting, name: 'Get setting'          },
    GET_HISTORY : { port: 2,   cmd: 1, decode: decodeGetHistory, encode: encodeGetHistory, name: 'Get history'          },
    SET_PROFILE : { port: 10,  cmd: 1, decode: decodeSetProfile, encode: encodeSetProfile, name: 'Set profile'          },
    CMD_UNJOIN  : { port: 10,  cmd: 8, decode: decodeCmdUnjoin,  encode: encodeCmdUnjoin,  name: 'Unjoin'               },
    CMD_ENDCOMP : { port: 224, cmd: 6, decode: decodeEndComp,    encode: encodeEndComp,    name: 'End compliance test'  },
}

const getReportFromBytes = channel => {
    for (let report in STRIPS_REPORTS) 
        if (STRIPS_REPORTS[report].channel == channel)
            return report;
    throw { message: 'Unknown channel: ' + channel };
}

const getHistoryCountAndCheckLength = bytes => {
    let pos = 0;
    let historyItemCount = 0;
    let decoded = {};
    while (pos < bytes.length) {
        // First a byte with a history bit and a channel ID, ignore history bits in this phase
        if (bytes[pos] & 0x80)
            historyItemCount++;
        let report = getReportFromBytes(bytes[pos] & 0x7f);
        let size   = report.coding.getsize(bytes, pos+1);
        let endpos = pos + size + 1;
        if (endpos > bytes.length)
            throw {message: 'Incomplete data'};
        decoded[report] = report.coding.decode(bytes, pos+1);
        pos = endpos;
    }
    decoded.historyItemCount = historyItemCount;
    decoded.timestamp     = new Date().getTime();
    return decoded;
}

const decodeDirectUplink = (bytes) => {
    // 1. Check that the contained reports are complete vs length. It will throw if bad length
    const history_count = getHistoryCountAndCheckLength(bytes);
    // 2. Decode all contained reports and add to one object
    
}

const decodeHistoryUplink = (bytes) => {

}

const STRIPS_UPLINK_PORTS = {
    DIRECT_PORT:  { port: 1, decode: decodeDirectUplink  },
    HISTORY_PORT: { port: 2, decode: decodeHistoryUplink },
}

// Attempt at decoding an uplink (reference is in raw-translate.js)
const decodeLoraStripsUplink = (port, bytes) => {
    let pos = 0;
    for (let kind in STRIPS_UPLINK_PORTS)
        if (STRIPS_UPLINK_PORTS[kind].port == port)
            return STRIPS_UPLINK_PORTS[kind].decode(bytes);
    throw ("No function for decoding uplinks on port " + port);
}


// Either return a structure representing the downlink, or throw an error with message corresponding to the problem
const decodeLoraStripsDownlink = (port, bytes) => {
    if (bytes == null || bytes.length < 1)
        throw { message: 'Not enough data'};
    const cmd = bytes[0];
    for (var id in STRIPS_PORTCOMMANDS) {
        if (STRIPS_PORTCOMMANDS[id].port == port && STRIPS_PORTCOMMANDS[id].cmd == cmd) {
            let result  = STRIPS_PORTCOMMANDS[id].decode(bytes, 1);
            result['cmd'] = STRIPS_PORTCOMMANDS[id];
            return result;
        }
    }
    throw { message: 'Unrecognized downlink'};
}

// Function for encoding a downlink (using object of same format as decodeLoraStripsDownlink),
// Specifically: each field is one of STRIPS_SETTINIGS properties. Only value field is read from each in case of SET_SETTING.
// In addition a "cmd" field should be present to match one of the PORT_COMMANDS. See each function for further data.
const encodeLoraStripsDownlink = (obj) => {
    if (null == obj || false == obj.hasOwnProperty('cmd'))
        throw {message:'Bad object for encode, null or missing cmd.'}
    const cmd = obj['cmd'].name;
    for (var c in STRIPS_PORTCOMMANDS) {
        if (cmd == STRIPS_PORTCOMMANDS[c].name) {
            return { data: d2h(STRIPS_PORTCOMMANDS[c].cmd, 1) + STRIPS_PORTCOMMANDS[c].encode(obj), 
                     port: STRIPS_PORTCOMMANDS[c].port };
        }
    }
    throw {message: 'Unknown command: ' + cmd}
}

// Test/example code follows

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function test() {
    rl.question('Enter port (decimal): ', (port) => {
        port = Number(port);
        rl.question('Enter downlink (hex format): ', (hex) => { 
            try {
                let data = Buffer.from(hex, "hex");
                let decoded = decodeLoraStripsDownlink(port, data);
                console.log("Decoded:       " + JSON.stringify(decoded));
                let encoded = encodeLoraStripsDownlink(decoded);
                console.log("Encoded again: " + JSON.stringify(encoded));
                if (encoded.data.toUpperCase() != hex.toUpperCase())
                    console.log("WARN: Encode result is different from decode result");
                if (encoded.port != port)
                    console.log("WARN: Encoded port "+encoded.port+" differs from port.");

                // Check if there are any exceptions or errors when re-encoding the same data
                let decoded2 = decodeLoraStripsDownlink(encoded.port, Buffer.from(encoded.data, "hex"));
                let encoded2 = encodeLoraStripsDownlink(decoded2);
                if (encoded2.data.toUpperCase() != encoded.data.toUpperCase())
                    console.log("WARN: Re-decoded and encoded data differs");
            } catch (err) { console.log(err.message); }
            test(); // Ugly tail recursion, typical for callback style
        })
    })
}

test();
