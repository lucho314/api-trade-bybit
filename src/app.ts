import express from 'express';
import routes from './routes/index';
import  routesV2 from './v2/routes/index';
//import { initDb } from './db/postgres';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/v2', routesV2);
app.use('/api', routes);

// initDb().then(() => {
//     console.log('Base de datos PostgreSQL inicializada');
// });

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});