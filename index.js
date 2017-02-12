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

// reconnection interval
var reconnectInterval=60*1000;

//interval handlers
var handlers={
  temperature:{},
  battery:{}
};

// intervat to check battery status
var batteryInterval=60*60*1000;

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
        setTimeout(function(){
          if (handlers.temperature[peripheral.id]) {
            clearInterval(handlers.temperature[peripheral.id]);
          }
          if (handlers.battery[peripheral.id]) {
            clearInterval(handlers.battery[peripheral.id]);
          }
          console.log(moment().toISOString(),peripheral.advertisement.localName,'reconnect');
          getServices(peripheral);
        },reconnectInterval);
      });
      peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs,characteristicUUIDs,function(error, services,characteristics){
        if (err) {
          console.log(moment().toISOString(),'Discovery error',err,'for',peripheral.advertisement.localName);
        } else {
          characteristics.forEach(function(characteristic){
            if (characteristic.uuid=="ff92") {
              try {
                characteristic.read(function(err,data) {
                  if (err) {
                    console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                  } else {
                    var t=[data.readInt8(0, 1),data.readInt8(2, 1)].join('.');
                    var h=data.readInt8(1, 1);
                    console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],t,h,data);
                  }
                });
              } catch(err){

              }
              if (handlers.temperature[peripheral.id]) {
                clearInterval(handlers.temperature[peripheral.id]);
              }
              handlers.temperature[peripheral.id]=setInterval(function(){
                try{
                  characteristic.read(function(err,data) {
                    if (err) {
                      console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                    } else {
                      var t=[data.readInt8(0, 1),data.readInt8(2, 1)].join('.');
                      var h=data.readInt8(1, 1);
                      console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],t,h,data);
                    }
                  });
                } catch(err){

                }
              },temperatureInterval);  
            } else if (characteristic.uuid=="2a19") {
              try {
                characteristic.read(function(err,data) {
                  if (err) {
                    console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                  } else {
                    var b=data.readInt8(0, 1);
                    console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],b);
                  }
                });
              } catch(err){
                
              }
              if (handlers.battery[peripheral.id]) {
                clearInterval(handlers.battery[peripheral.id]);
              }
              handlers.battery[peripheral.id]=setInterval(function(){
                try {
                  characteristic.read(function(err,data) {
                    if (err) {
                      console.log(moment().toISOString(),'Error reading',characteristic,peripheral.advertisement.localName);
                    } else {
                      if (data){
                        var b=data.readInt8(0, 1);
                        console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],b);
                      } else {
                        console.log(moment().toISOString(),peripheral.advertisement.localName,characteristics_names[characteristic.uuid],'no data');
                      }
                    }
                  });
                } catch(err){
                
                }
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

