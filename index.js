var noble = require('noble');
var moment = require('moment');

var sensors=null;
try {
  sensors=require('./sensors.json');
} catch(err) {
  console.log('Scanning... Use the UUIDs below to configure the sensors.json file');
  setTimeout(function(){
    terminate();
  },60*1000);
}

// names for the logs
var characteristics_names = {
  "2a19":"Battery level",
  "ff92":"Temperature/Humidity"
};

// services and characteristics filters
var serviceUUIDs = [];
var characteristicUUIDs = ["2a19","ff92"];

// set to number of seconds to limit execution time
var maxrun=-1;

// intervat to check temperature status
var temperatureInterval=60*1000;

// intervat to check battery status
var batteryInterval=60*1000;

if (maxrun>0) {
  setTimeout(function(){
    terminate();
  },maxrun);
}

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  if (!sensors || sensors.length==0 || sensors.indexOf(peripheral.id)>-1) {
    console.log(moment().toISOString(),'Found ',peripheral.advertisement.localName,'(' , peripheral.id , ')');
    getServices(peripheral);
  }
});

function getServices(peripheral) {

  peripheral.connect(function(err) {
    if (err) {
      console.log(moment().toISOString(),'Error ',err,'connectinh to ',peripheral.advertisement.localName);
    } else {
      peripheral.once('disconnect',function(err){ 
        console.log(moment().toISOString(),peripheral.advertisement.localName,'reconnect');
        getServices(peripheral);
      });
      peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs,characteristicUUIDs,function(error, services,characteristics){
        if (err) {
          console.log(moment().toISOString(),'Discovery error',err,'for',peripheral.advertisement.localName);
        } else {
          characteristics.forEach(function(characteristic){
            if (characteristic.uuid=="ff92") {
              characteristic.read(function(err,data) {
                if (err) {
                  console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                } else {
                  var t=[data.readUIntBE(0, 1),data.readUIntBE(2, 1)].join('.');
                  var h=data.readUIntBE(1, 1);
                  console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],t,h);
                }
              });
              setInterval(function(){
                characteristic.read(function(err,data) {
                if (err) {
                  console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                } else {
                  var t=[data.readUIntBE(0, 1),data.readUIntBE(2, 1)].join('.');
                  var h=data.readUIntBE(1, 1);
                  console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],t,h);
                }
              });
              },temperatureInterval);  
            } else if (characteristic.uuid=="2a19") {
              characteristic.read(function(err,data) {
                if (err) {
                  console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                } else {
                  var b=data.readUIntBE(0, 1);
                  console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],b);
                }
              });
              setInterval(function(){
                characteristic.read(function(err,data) {
                  if (err) {
                    console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                  } else {
                    if (data){
                      var b=data.readUIntBE(0, 1);
                      console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],b);
                    } else {
                      console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],'no data');
                    }
                  }
                });
              },batteryInterval);
            }             
          });

        }
      }); 
    }
  });
}

function terminate() {
  noble.stopScanning();
  process.exit();
}

