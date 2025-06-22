import postgres from 'postgres'
import { DATABASE_URL } from '../constats';

console.log('Conectando a la base de datos:', DATABASE_URL);

const sql = postgres(DATABASE_URL);

export default sql;