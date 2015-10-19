/*jslint node: true */
"use strict";
Buffer.prototype.toByteArray = function () {
    return Array.prototype.slice.call(this, 0);
};


/* | Dependencies
 --|---------------------------------*/

var noble = require('noble');
var osc   = require('osc-min');
var dgram = require('dgram');
var edn   = require("jsedn");
var fs    = require('fs');
var _     = require('lodash');


/* | Globals
 --|---------------------------------*/

var scratchOne = "a495ff21c5b14b44b5121370f02d74de",
    scratchTwo = "a495ff22c5b14b44b5121370f02d74de",
    scratchThr = "a495ff23c5b14b44b5121370f02d74de",
    scratchFor = "a495ff24c5b14b44b5121370f02d74de",
    scratchFiv = "a495ff25c5b14b44b5121370f02d74de";

var scratch = [scratchOne, scratchTwo, scratchThr, scratchFor, scratchFiv];

var names = process.argv;
var ports = {};
var devices = {};
var observed_devices = {};

/* | Printer
 --|---------------------------------*/

var pl = function(line, stats) {
    console.log(line);
    if (stats) {
        console.log('     \\____ # Connected: ' + Object.keys(devices).length + '\n         | # Observed : ' + Object.keys(observed_devices).length + '\n');
    }
};


/* | Read Port Conifguration
 --|---------------------------------*/
fs.readFile("port-record/mpr.edn", 'utf8', function (err, data) {
    if (err) throw err;
    ports = edn.toJS(edn.parse(data));
});


/* | OSC Werks
 --|---------------------------------*/

var udp = dgram.createSocket("udp4");
var oscBuffer;
var oscDebugBuffer;


var sendDataToOSC = function (peripheral, characteristic, data) {

    if (peripheral != null && ports[':processing-bean'] != undefined) {

        var uuid = String(peripheral.uuid);
        var name = String(peripheral.advertisement.localName);
        var outport = ports[':processing-bean'];
        var outport_sound = ports[':sound'];
        var outport_dash = ports[':dashboard'];

        oscBuffer = osc.toBuffer({
            address: "/devices",
            args: [uuid, name, characteristic, data]
        });

        //oscDebugBuffer = osc.toBuffer({
        //    address: "/devices",
        //    args: ["device"]
        //});

        try {
            udp.send(oscBuffer, 0, oscBuffer.length, outport, "localhost");
            udp.send(oscBuffer, 0, oscBuffer.length, outport_sound, "localhost");
            udp.send(oscBuffer, 0, oscBuffer.length, outport_dash, "localhost");
        } catch (e) {
            pl("Error Thrown:", false);
            pl(e, false);
        }

        oscBuffer = null;
        //oscDebugBuffer = null;
    } else if (ports[':processing-bean'] == undefined) {
        sendDataToOSC(peripheral, characteristic, data);
    }

};


/* | Bean communication
 --|---------------------------------*/

var beanUUID = "a495ff10c5b14b44b5121370f02d74de";

var device_by_key = function (uuid) {
    Object.keys(devices).forEach(function (key) {
        if (key == uuid) {
            return devices[key];
        } else {
            return false;
        }
    });
};

var returnValue = function (val) {

    if (parseInt(val[0], 10) == 1) {
        val = (parseInt(val.slice(1), 10));
    } else if (parseInt(val[0], 10) == 2) {
        val = (parseInt(val.slice(1), 10)) * -1;
    } else {
        val = false;
    }

    return val;
};

var subscribeToChars = function (characteristics, peripheral) {

    characteristics.forEach(function (characteristic, index) {

        var scratchNumber = index + 1;

        characteristic.on("read", function (data, sad) {

            var value = (((((data[(0)]) << (0)) + ((data[(1)]) << (8))) + ((data[(2)]) << (16))) + ((data[(3)]) << (24)));

            if (value != 0) {
                value = value.toString(10);

                var value1 = value.slice(0, -4);
                var value2 = value.slice(4);

                value1 = returnValue(value1);
                value2 = returnValue(value2);

                if (value1 != false) {
                    sendDataToOSC(peripheral, (scratchNumber * 2) - 1, value1); // To OSC
                }

                if (value2 != false) {
                    sendDataToOSC(peripheral, (scratchNumber * 2), value2); // To OSC
                }

            }


        });

        characteristic.notify(true, function (err) {
            if (err) throw err;
        });

    });

    pl("<-- Sending to port " + ports[':processing-bean'] + " from: " + peripheral.advertisement.localName, false);
    pl("<-- Sending to port " + ports[':sound'] + " from: " + peripheral.advertisement.localName, false);

};

var setupChars = function (peripheral) {

    peripheral.discoverSomeServicesAndCharacteristics([], scratch, function (err, services, characteristics) {
        if (err) throw err;
        subscribeToChars(characteristics, peripheral);
    });

};

var setupPeripheral = function (peripheral) {

    pl('    Connecting to ' + peripheral.advertisement.localName + '...', true);

    peripheral.connect(function (err) {
        if (err) throw err;

        pl('+   Connected successfully to ' + peripheral.advertisement.localName, true);

        setupChars(peripheral);

        peripheral.on('disconnect', function () {
            delete devices[peripheral.uuid];
            pl("!   " + peripheral.advertisement.localName + " has disconnected.", true);
        });

    });

};


noble.on('discover', function (peripheral) {

    if(!(peripheral.uuid in observed_devices)) {
        observed_devices[peripheral.uuid] = {"name" : peripheral.advertisement.localName, "attempted" : false};
    } else {
        observed_devices[peripheral.uuid]["attempted"] = true;
    }

    if (_.contains(peripheral.advertisement.serviceUuids, beanUUID)) {

        if (!observed_devices[peripheral.uuid]["attempted"]) {
            pl("    Found a Bean named: " + peripheral.advertisement.localName, false);
        }

        if (!(peripheral.uuid in devices)) {
            if (names.length <= 2 || names.indexOf(peripheral.advertisement.localName) > -1) {
                devices[peripheral.uuid] = peripheral;
                setupPeripheral(peripheral);
            }
        }

    }

});


noble.on('stateChange', function (state) {
    if (state == "poweredOn") {
        pl("\n\n## Started Scanning", false);
        noble.startScanning([], true);
    }
});

process.stdin.resume(); //so the program will not close instantly


/* | Exit Handler
   | Disconnects from the bean, in order to reset BLE comms. */

function exitHandler(options, err) {

    pl('\n\n## Starting Closing Sequence', true);
    noble.stopScanning();
    pl('-   Stopped Scanning', false);

    var size = Object.keys(devices).length;
    var count = 0;
    var ensure_exit;

    if (size > 0) {
        Object.keys(devices).forEach(function (key) {
            var peripheral = devices[key];
            peripheral.disconnect(function (err) {
                pl('-   Disconnecting from: ' + peripheral.advertisement.localName, false);
                count++;
                if (count == size) {
                    clearTimeout(ensure_exit);
                    setTimeout(function () {
                        pl('\n+ All devices disconnected. Exiting cleanly.\n', false);
                        process.exit();
                    }, 500);
                }
            });
        });
    } else {
        clearTimeout(ensure_exit);
        setTimeout(function () {
            pl('\n+ Nothing to disconnect from. Exiting cleanly.\n', false);
            process.exit();
        }, 500);
    }

    ensure_exit = setTimeout(function () {
        pl('\n! Unhandled exit, though all devices should be disconnected.\n', false);
        process.exit();
    }, 5000);

}

process.on('SIGINT', exitHandler.bind(null, {exit: true}));
