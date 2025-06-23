import express from 'express';
import routes from './routes/index';
import  routesV2 from './v2/routes/index';
import { testInsertarOperacion } from './respository/orderRepository';
import path from 'path';
//import { initDb } from './db/postgres';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
//cors http://localhost:5173/
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use('/app', express.static(path.join(__dirname, 'public')));

app.get(/^\/app(\/.*)?$/, (req, res, next) => {
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/v2', routesV2);
app.use('/api', routes);








// initDb().then(() => {
//     console.log('Base de datos PostgreSQL inicializada');
// });

//testInsertarOperacion();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});