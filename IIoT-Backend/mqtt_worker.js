const mqtt = require('mqtt');
const { Pool } = require('pg');

// ========================================================
// 1. KONEKSI DATABASE POSTGRESQL (LOCAL HOSTBINDING DOCKER)
// ========================================================
const pool = new Pool({
  user: 'user',
  host: 'localhost',
  database: 'iiot_db',
  password: 'password',
  port: 5432,
});

// ========================================================
// 2. KONEKSI BROKER MQTT MOSQUITTO
// ========================================================
console.log('🔄 Mencoba memicu koneksi ke mqtt://localhost:1883...');
const client = mqtt.connect('mqtt://127.0.0.1:1883');

client.on('connect', () => {
  console.log('✅ SAKTI! Worker sukses jabat tangan dengan Mosquitto Docker!');
  
  // Mendengarkan semua topik agar fleksibel membaca data dari PLC mana pun
  client.subscribe('#', (err) => {
    if (err) console.error('❌ Gagal subscribe:', err);
    else console.log('📡 Worker sudah pasang telinga mendengarkan SEMUA topik (#)');
  });
});

client.on('reconnect', () => {
  console.log('🔄 Worker kehilangan arah, mencoba menyambung ulang (reconnecting)...');
});

client.on('error', (error) => {
  console.error('❌ WADUH EROR JARINGAN MQTT:', error.message);
});

// ========================================================
// 3. LOGIKA UTAMA: PIPELINE DATA SENSOR KE POSTGRES
// ========================================================
client.on('message', async (topic, message) => {
  console.log(`📩 TANGKAP DATA! Topik: [${topic}] -> Payload: ${message.toString()}`);

  try {
    const payloadData = JSON.parse(message.toString());
    const topicParts = topic.split('/');
    
    // 🌟 PERBAIKAN 1: Ekstrak Terminal ID dari ujung topik sebagai project_id murni
    const projectId = topicParts[topicParts.length - 1].toString().trim();

    const jsonbPayload = {
      ...payloadData,
      value: parseFloat(payloadData.Haiwell_PLC_1_tempSensor || 0), 
      status: payloadData.Haiwell_PLC_1_fanStatus === "1" ? "RUNNING" : "STOPPED"
    };

    // 🌟 PERBAIKAN 2: Ubah kolom target INSERT menjadi project_id sesuai struktur tabel baru
    const query = `
      INSERT INTO telemetry_logs (project_id, payload, created_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta');
    `;
    
    // Tusuk data string projectId ('123') ke kolom baru
    await pool.query(query, [projectId, JSON.stringify(jsonbPayload)]);
    console.log(`✅ [SUCCESS] Data Project #${projectId} sukses di-archive ke kolom baru Postgres!`);
    
  } catch (err) {
    console.error('❌ EROR QUERY SQL:', err.message);
  }
});