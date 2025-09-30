await Meteor.callAsync("methodName", param, function(error, result) {
  if (error) console.error(error);
  else console.log(result);
});
