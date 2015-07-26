process.on('message', function (options) {
  require('../index')(options).then(function (context) {
    process.send({value: context});
  }, function (err) {
    process.send({error: err});
  });
});
