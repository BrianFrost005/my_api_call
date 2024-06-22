const http = require('http');
//import app file
const app = require('./app');

//define port
const port = process.env.PORT || 3000;
//define website instance?
const server = http.createServer(app);

//website listen at defined port
server.listen(port);


