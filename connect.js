/*jslint node: true */
"use strict";
Buffer.prototype.toByteArray = function () {
    return Array.prototype.slice.call(this, 0);
};

// To-Do, test for disconnected.

/* | LightBlue Bean to OSC via NOBLE.
 ---|---------------------------------*/

var scratchOne = "a495ff21c5b14b44b5121370f02d74de",
    scratchTwo = "a495ff22c5b14b44b5121370f02d74de",
    scratchThr = "a495ff23c5b14b44b5121370f02d74de",
    scratchFor = "a495ff24c5b14b44b5121370f02d74de",
    scratchFiv = "a495ff25c5b14b44b5121370f02d74de";

// ******
// Adjust based on however many scratch characteristics you need to read. 
// Up to the three listed above. (Comma separated within brackets below.)
var scratch = [scratchOne, scratchTwo, scratchThr, scratchFor, scratchFiv];
// ******
var names = process.argv;
var devices = {};

/* | Dependencie
 --|---------------------------------*/

var noble = require('noble');
var osc = require('osc-min');
var dgram = require('dgram');
var _ = require('lodash');


/* | OSC Werks
 --|---------------------------------*/

var udp = dgram.createSocket("udp4");

var outport = 41234;

console.log("OSC will be sent to: http://localhost:" + outport);

// Send Data Function

var sendDataToOSC = null;
var oscBuffer;

sendDataToOSC = function (peripheral, characteristic, data) {
    if (peripheral != null) {

        var uuid = String(peripheral.uuid);
        var name = String(peripheral.advertisement.localName);

        oscBuffer = osc.toBuffer({
            address: "/devices",
            args: [uuid, name, characteristic, data]
        });

        try {
            udp.send(oscBuffer, 0, oscBuffer.length, outport, "localhost");
        } catch (e) {
            console.log("Error Thrown:");
            console.log(e);
        }

        oscBuffer = null;
    }

};


/* | Bean communication
 ---|---------------------------------*/

var beanUUID = "a495ff10c5b14b44b5121370f02d74de";

var device_by_key = function(uuid) {
    Object.keys(devices).forEach(function(key) {
        if (key == uuid) {
            return devices[key];
        } else {
            return false;
        }
    });
};

// This function takes values from Bean characteristics. It waits for new data to
// come in and then sends that on to the OSC port.  

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

    console.log("Sending Data to OSC")

};

var setupChars = function (peripheral) {

    peripheral.discoverSomeServicesAndCharacteristics([], scratch, function (err, services, characteristics) {
        if (err) throw err;
        subscribeToChars(characteristics, peripheral);
    });

};

var setupPeripheral = function (peripheral) {

    console.log('Connecting to ' + peripheral.advertisement.localName + '...');

    peripheral.connect(function (err) {
        if (err) throw err;

        console.log('Connected to ' + peripheral.advertisement.localName);

        setupChars(peripheral);

        peripheral.on('disconnect', function () {
            delete devices[peripheral.uuid];
            console.log(peripheral.advertisement.localName + " has disconnected.");
        });

    });

};


noble.on('discover', function (peripheral) {

    if (_.contains(peripheral.advertisement.serviceUuids, beanUUID)) {
        console.log("Found a Bean named: " + peripheral.advertisement.localName);

        if (!(peripheral.uuid in devices)) {
            if (names.length <= 2 || names.indexOf(peripheral.advertisement.localName) > -1) {
                devices[peripheral.uuid] = peripheral;
                setupPeripheral(peripheral);
            }
        }

    } else {
        console.log("Found a random BLE device, that is not a Bean, ignored.");
    }

});


noble.on('stateChange', function (state) {
    if (state == "poweredOn") {
        console.log("Started Scanning");
        noble.startScanning([],true);
    }
});

process.stdin.resume(); //so the program will not close instantly


/* | Exit Handler
 | Disconnects from the bean, in order to reset BLE comms. */

function exitHandler(options, err) {

    noble.stopScanning();

    var size = Object.keys(devices).length;
    var count = 0;

    if (size > 0) {
        Object.keys(devices).forEach(function (key) {
            var peripheral = devices[key];
            peripheral.disconnect(function (err) {
                console.log('Disconnecting from: ' + peripheral.advertisement.localName);
                count++;
                if (count == size) {
                    setTimeout(function () {
                        console.log('All devices disconnected, exiting.');
                        process.exit();
                    }, 500);
                }
            });
        });
    } else {
        process.exit();
    }

}

process.on('SIGINT', exitHandler.bind(null, {exit: true}));
