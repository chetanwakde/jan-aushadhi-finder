const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'jan_aushadhi.db');
const db = new Database(dbPath);

const bidarStores = [
  {
    name: "Jan Aushadhi Kendra - BRIMS Hospital",
    address: "Beside Entrance Gate No- 2, BRIMS Teaching Hospital Premises, Bidar - 585401",
    lat: 17.9150,
    lng: 77.5120,
    phone: "08482-226501",
    timings: "9:00 AM - 10:00 PM"
  },
  {
    name: "Jan Aushadhi Kendra - Bank Colony",
    address: "Bank Colony, Near Sahakar Bhavan, Bidar - 585401",
    lat: 17.9080,
    lng: 77.5250,
    phone: "N/A",
    timings: "9:00 AM - 9:00 PM"
  },
  {
    name: "Jan Aushadhi Kendra - Humnabad Road",
    address: "Sh 122, Bardapur, Ganesh Nagar Road, Bidar - 585403",
    lat: 17.9010,
    lng: 77.5380,
    phone: "N/A",
    timings: "9:00 AM - 9:00 PM"
  }
];

// Ensure table exists (though server.js should have created it)
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    lat REAL,
    lng REAL,
    phone TEXT,
    timings TEXT,
    rating REAL DEFAULT 4.5,
    totalMedicines INTEGER DEFAULT 1200
  )
`);

const insert = db.prepare('INSERT INTO stores (name, address, lat, lng, phone, timings) VALUES (?, ?, ?, ?, ?, ?)');

for (const s of bidarStores) {
  // Simple check to avoid duplicates
  const exists = db.prepare('SELECT id FROM stores WHERE name = ?').get(s.name);
  if (!exists) {
    insert.run(s.name, s.address, s.lat, s.lng, s.phone, s.timings);
    console.log(`Inserted: ${s.name}`);
  } else {
    console.log(`Already exists: ${s.name}`);
  }
}

db.close();
console.log('Seeding complete!');
