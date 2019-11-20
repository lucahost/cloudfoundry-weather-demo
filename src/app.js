const OpenWeatherMapHelper = require("openweathermap-node");
const cron = require("node-cron");
var amqp = require("amqplib/callback_api");
var cfenv = require("cfenv");

const log = console.log;

var appEnv = cfenv.getAppEnv();
const url = appEnv.getServiceURL("rabbitmq");

log("process started");
var task = cron.schedule("5 * * * *", function() {
  log("cron job started");
  const helper = new OpenWeatherMapHelper({
    APPID: process.env.OPENWEATHER_API_KEY,
    units: "metric"
  });

  helper.getCurrentWeatherByCityName(
    process.env.LOCATION_NAME,
    (err, currentWeather) => {
      if (err) {
        log(err);
      } else {
        const modifiedObj = {
          location: currentWeather.name,
          celsius: currentWeather.main.temp,
          humidity: currentWeather.main.humidity,
          rain: 0,
          snow: 0,
          coordinatesLatitude: currentWeather.coord.lat,
          coordinatesLongitude: currentWeather.coord.lon
        };
        amqp.connect(url, function(error0, connection) {
          if (error0) {
            throw error0;
          }
          connection.createChannel(function(error1, channel) {
            if (error1) {
              throw error1;
            }
            var queue = "weather-data";
            var msg = JSON.stringify(modifiedObj);
            channel.sendToQueue(queue, Buffer.from(msg));
            log("sent to queue at: " + new Date());
          });
          setTimeout(function() {
            connection.close();
          }, 500);
        });
      }
    }
  );
});

task.start();
