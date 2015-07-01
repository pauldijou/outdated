process.on('message', function (options) {
  require('../index')(options).then(function (context) {
    process.send(context);
  });
});
