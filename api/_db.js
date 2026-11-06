// INMOBILIARIA CRUMEX · conexión a MongoDB (Atlas) compartida por todas las funciones.
//
// Variables de entorno en Vercel:
//   MONGODB_URI   cadena de conexión de Atlas (mongodb+srv://usuario:clave@cluster…/)
//   MONGODB_DB    opcional, nombre de la base (por defecto "crumex")
//
// Una sola conexión por instancia de Vercel (se reutiliza entre peticiones).
import { MongoClient } from 'mongodb';
import { HttpError } from './_http.js';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB || 'crumex';
export const READY = !!uri;

const OPTIONS = { connectTimeoutMS: 6000, serverSelectionTimeoutMS: 6000, socketTimeoutMS: 15000, maxPoolSize: 10, minPoolSize: 0, appName: 'crumex' };

export async function getDB() {
  if (!uri) throw new HttpError(503, 'Falta configurar MONGODB_URI en Vercel (ver README).', 'no_db');
  if (!global._crxMongo) {
    const client = new MongoClient(uri, OPTIONS);
    global._crxMongo = client.connect().catch((e) => { global._crxMongo = null; throw e; });
  }
  const db = (await global._crxMongo).db(dbName);
  if (!global._crxIdx) global._crxIdx = ensureIndexes(db).catch((e) => { global._crxIdx = null; console.error('[crumex] índices', e.message); });
  await global._crxIdx;
  return db;
}

// Índices: sin ellos cada consulta recorre la colección completa
async function ensureIndexes(db) {
  const make = (col, keys, opts) => db.collection(col).createIndex(keys, opts || {}).catch((e) => console.warn('[crumex] índice', col, e.message));
  await Promise.all([
    make('users', { email: 1 }, { unique: true }),
    make('sessions', { expires_at: 1 }, { expireAfterSeconds: 0 }),
    make('sessions', { user_id: 1 }),
    make('limits', { expires_at: 1 }, { expireAfterSeconds: 0 }),
    make('properties', { ref_code: 1 }, { unique: true }),
    make('properties', { slug: 1 }, { unique: true }),
    make('properties', { status: 1, published_at: -1 }),
    make('properties', { zone_id: 1 }),
    make('properties', { owner_token: 1 }, { sparse: true }),
    make('wanted', { active: 1, created_at: -1 }),
    make('zones', { name: 1, city: 1 }, { unique: true }),
    make('leads', { created_at: -1 }),
    make('leads', { status: 1 }),
    make('leads', { follow_up_at: 1 }, { sparse: true }),
    make('leads', { property_id: 1 }),
    make('visits', { scheduled_at: 1 }),
    make('visits', { feedback_token: 1 }, { sparse: true }),
    make('alerts', { token: 1 }, { unique: true }),
    make('alerts', { active: 1, email: 1 }),
    make('documents', { contact_id: 1 }, { sparse: true }),
    make('deals', { property_id: 1 }),
    make('articles', { slug: 1 }, { unique: true }),
    make('events', { property_id: 1, kind: 1, created_at: -1 }),
    make('events', { created_at: -1 }),
    make('events', { day: 1 }),
    make('documents', { property_id: 1, created_at: -1 }),
    make('price_history', { property_id: 1, changed_at: -1 }),
    make('activity', { at: 1 }, { expireAfterSeconds: 400 * 86400 }),
    make('activity', { user_id: 1, at: -1 }),
    make('leads', { assigned_to: 1 })
  ]);
}

// Consecutivos: CRX-00001, zonas 1, 2, 3…
export async function nextSeq(db, name) {
  const r = await db.collection('counters').findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return (r && r.seq) || 1;
}

// Documento de Mongo → objeto para el navegador (_id pasa a ser id)
export const out = (d) => { if (!d) return d; const { _id, ...rest } = d; return { id: _id, ...rest }; };
