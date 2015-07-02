process.on('message', function (options) {
  require('../index')(options).then(function (context) {
    process.send(context);
  }, function (err) {
    console.log(err.stack || err);
    process.send({});
  });
});
