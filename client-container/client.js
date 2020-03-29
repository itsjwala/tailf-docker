
const WebSocket = require('ws')

const ws = new WebSocket('ws://tailfserver:8081');


ws.on('message', function incoming(data) {
  console.log(data);
});
