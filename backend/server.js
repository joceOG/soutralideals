import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from 'dotenv';
import router from './routes/userRoutes.js';


/** import connection file */
import connect from './database/connex.js';

const app = express()


/** app middlewares */
app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());
config();




/** appliation port */
const port = process.env.PORT || 8080;


/** routes */
app.use('/api', router) /** apis */


app.get('/', (req, res) => {
    try {
        res.json("Get Request")
    } catch (error) {
        res.json(error)
    }
})




// const normalizePort = val => {
//     const port = parseInt(val, 10);

//     if (isNaN(port)) {
//         return val;
//     }
//     if (port >= 0) {
//         return port;
//     }
//     return false; 
// };

// const port = normalizePort(process.env.PORT ||  '3000');
// app.set('port', port);

// const errorHandler = error => {
//     if (error.syscall !== 'listen') {
//         throw error;
//     }
//     const address = server.address();
//     const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
//     switch (error.code) {
//         case 'EACCES':
//             console.error(bind + ' requires elevated privileges.');
//             process.exit(1);
//             break;
//         case 'EADDRINUSE':
//             console.error(bind + ' is already in use.');
//             process.exit(1);
//             break;
//         default:
//             throw error;
//     }
// };

// const server = http.createServer(app);

// server.on('error', errorHandler);
// server.on('listening', () => {
//     const address = server.address();
//     const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
//     console.log('Listening on ' + bind);
// });





connect().then(()=> {
    try{
    app.listen(port,()=>{
        console.log(`Server connected to http://localhost:${port}`)})
}catch (error) {
    console.log("Cannot connect to the server");
}
})
.catch(error => {
console.log("Invalid Database Connection");
})