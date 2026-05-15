const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'jan_aushadhi.db');
const db = new Database(dbPath);

const naubadStores = [
  {
    name: "Jan Aushadhi Kendra - Karnataka College of Pharmacy",
    address: "Shop No. 1, Campus of KCP, Manai Road, near Naubad, Bidar - 585403",
    lat: 17.9310,
    lng: 77.4980,
    phone: "08482-234567",
    timings: "9:00 AM - 9:00 PM"
  },
  {
    name: "Jan Aushadhi Kendra - Mangalpeth",
    address: "Opp Police Health Centre, Police Quarters, Mangalpeth, Bidar - 585401",
    lat: 17.9135,
    lng: 77.5360,
    phone: "08482-221122",
    timings: "9:00 AM - 8:30 PM"
  },
  {
    name: "Jan Aushadhi Kendra - Gumpa Road",
    address: "Near Gumpa Checkpost, Udgir Road, Bidar - 585403",
    lat: 17.9450,
    lng: 77.4850,
    phone: "08482-230011",
    timings: "8:00 AM - 10:00 PM"
  }
];

const insert = db.prepare('INSERT INTO stores (name, address, lat, lng, phone, timings, rating, totalMedicines) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

for (const s of naubadStores) {
  const exists = db.prepare('SELECT id FROM stores WHERE name = ?').get(s.name);
  if (!exists) {
    insert.run(s.name, s.address, s.lat, s.lng, s.phone, s.timings, 4.5 + Math.random() * 0.4, 1100 + Math.floor(Math.random() * 300));
    console.log(`Inserted: ${s.name}`);
  } else {
    console.log(`Already exists: ${s.name}`);
  }
}

db.close();
console.log('Naubad area seeding complete!');
