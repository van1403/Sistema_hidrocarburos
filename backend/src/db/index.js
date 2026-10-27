// Elige el driver según DB_DRIVER (sqlite | supabase)
const driver = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
module.exports = driver === 'supabase' ? require('./supabase').crear() : require('./sqlite').crear();
