/*jslint node: true */
"use strict";
Buffer.prototype.toByteArray = function () {
    return Array.prototype.slice.call(this, 0);
};


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

var devices = [];


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
var connectedBean = null;

sendDataToOSC = function (characteristic, data) {
    if (connectedBean != null) {
        oscBuffer = osc.toBuffer({
            address: "/devices",
            args: [connectedBean.uuid, connectedBean.advertisement.loacalName, characteristic, data]
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

var subscribeToChars = function (characteristics) {

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
                    sendDataToOSC((scratchNumber * 2) - 1, value1); // To OSC
                }

                if (value2 != false) {
                    sendDataToOSC((scratchNumber * 2), value2); // To OSC
                }

            }


        });

        characteristic.notify(true, function (err) {
            if (err) throw err;
        });

        console.log("Sending data for scratch #" + scratchNumber);

    });

};

var setupChars = function (peripheral) {

    peripheral.discoverSomeServicesAndCharacteristics([], scratch, function (err, services, characteristics) {
        if (err) throw err;
        subscribeToChars(characteristics);
    });

};

var setupPeripheral = function (peripheral) {

    console.log('Connecting to ' + peripheral.advertisement.localName + '...');

    peripheral.connect(function (err) {
        if (err) throw err;

        console.log('Connected!');
        sendDataToOSC(3, 0);
        connectedBean = peripheral; // Sets the global to the Bean. Yuck.
        devices.push(peripheral);
        console.log(peripheral);
        setupChars(peripheral);

        peripheral.on('disconnect', function () {
            console.log("The bean disconnected, trying to find it...");
            //sendDataToOSC(4, 0);
            //noble.startScanning();
        });

    });

};

noble.on('discover', function (peripheral) {

    if (_.contains(peripheral.advertisement.serviceUuids, beanUUID)) {
        console.log("Found a Bean");
        noble.stopScanning();
        console.log("Stopped scanning.");

        // Once found, connect:
        setupPeripheral(peripheral);

    } else {
        console.log("Found a random BLE device, that is not a Bean, ignored.");
    }

});


noble.on('stateChange', function (state) {
    if (state == "poweredOn") {
        console.log("Started Scanning");
        noble.startScanning();
    }
});

process.stdin.resume(); //so the program will not close instantly


/* | Exit Handler
 | Disconnects from the bean, in order to reset BLE comms. */

var triedToExit = false;

function exitHandler(options, err) {
    if (connectedBean && !triedToExit) {
        triedToExit = true;
        console.log('Disconnecting from Bean...');
        connectedBean.disconnect(function (err) {
            console.log('Disconnected.');
            process.exit();
        });
    } else {
        process.exit();
    }
}

process.on('SIGINT', exitHandler.bind(null, {exit: true}));
