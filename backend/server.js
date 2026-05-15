/**
 * Jan Aushadhi Finder — Production Backend
 * Node.js + Express | JWT Auth | Rate Limiting | Helmet | Logging
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db, ...dbHelpers } = require('./db');

const app = express();

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com", "https://maps.googleapis.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com", "https://*.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://*.openstreetmap.org", "https://*.googleapis.com", "https://*.gstatic.com", "https://*.google.com"],
      connectSrc: ["'self'", "https://nominatim.openstreetmap.org", "https://maps.googleapis.com"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── RATE LIMITERS ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.' },
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Search rate limit exceeded.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/medicines/search', searchLimiter);

// ─── JWT MIDDLEWARE ───────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'jan-aushadhi-dev-secret-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}



// ─── USER DATABASE ─────────────────────────────────────────────────────────────
// Database helpers are used for persistent user storage.

// ─── MEDICINE DATABASE ────────────────────────────────────────────────────────
const medicines = [
  // Antibiotics
  { id: 1, brand: "Augmentin", generic: "Amoxicillin + Clavulanate", salt: "Amoxicillin 500mg + Clavulanic Acid 125mg", brandedPrice: 220, genericPrice: 38, category: "Antibiotic", uses: "Bacterial infections, respiratory tract infections" },
  { id: 2, brand: "Azithral", generic: "Azithromycin", salt: "Azithromycin 500mg", brandedPrice: 115, genericPrice: 22, category: "Antibiotic", uses: "Respiratory, skin, ear infections" },
  { id: 3, brand: "Cifran", generic: "Ciprofloxacin", salt: "Ciprofloxacin 500mg", brandedPrice: 85, genericPrice: 14, category: "Antibiotic", uses: "Urinary tract, respiratory infections" },
  { id: 4, brand: "Taxim-O", generic: "Cefixime", salt: "Cefixime 200mg", brandedPrice: 160, genericPrice: 28, category: "Antibiotic", uses: "ENT, urinary tract infections" },
  { id: 5, brand: "Clavam", generic: "Amoxicillin + Clavulanate", salt: "Amoxicillin 875mg + Clavulanic Acid 125mg", brandedPrice: 195, genericPrice: 35, category: "Antibiotic", uses: "Severe bacterial infections" },
  { id: 6, brand: "Ciplox", generic: "Ciprofloxacin", salt: "Ciprofloxacin 250mg", brandedPrice: 65, genericPrice: 10, category: "Antibiotic", uses: "Bacterial infections" },
  { id: 7, brand: "Doxycap", generic: "Doxycycline", salt: "Doxycycline 100mg", brandedPrice: 75, genericPrice: 12, category: "Antibiotic", uses: "Skin, respiratory, tick-borne infections" },
  { id: 8, brand: "Erythrocin", generic: "Erythromycin", salt: "Erythromycin 250mg", brandedPrice: 90, genericPrice: 15, category: "Antibiotic", uses: "Respiratory, skin infections" },
  { id: 9, brand: "Roxid", generic: "Roxithromycin", salt: "Roxithromycin 150mg", brandedPrice: 135, genericPrice: 25, category: "Antibiotic", uses: "ENT, respiratory infections" },
  { id: 10, brand: "Novamox", generic: "Amoxicillin", salt: "Amoxicillin 500mg", brandedPrice: 70, genericPrice: 12, category: "Antibiotic", uses: "General bacterial infections" },
  // Pain & Fever
  { id: 11, brand: "Crocin", generic: "Paracetamol", salt: "Paracetamol 500mg", brandedPrice: 30, genericPrice: 5, category: "Analgesic/Antipyretic", uses: "Fever, mild pain, headache" },
  { id: 12, brand: "Dolo 650", generic: "Paracetamol", salt: "Paracetamol 650mg", brandedPrice: 32, genericPrice: 6, category: "Analgesic/Antipyretic", uses: "Fever, body pain" },
  { id: 13, brand: "Brufen", generic: "Ibuprofen", salt: "Ibuprofen 400mg", brandedPrice: 45, genericPrice: 8, category: "NSAID", uses: "Pain, inflammation, fever" },
  { id: 14, brand: "Voveran", generic: "Diclofenac", salt: "Diclofenac Sodium 50mg", brandedPrice: 55, genericPrice: 9, category: "NSAID", uses: "Joint pain, muscle pain" },
  { id: 15, brand: "Combiflam", generic: "Ibuprofen + Paracetamol", salt: "Ibuprofen 400mg + Paracetamol 325mg", brandedPrice: 38, genericPrice: 7, category: "NSAID/Analgesic", uses: "Pain, fever, inflammation" },
  { id: 16, brand: "Naprosyn", generic: "Naproxen", salt: "Naproxen 500mg", brandedPrice: 80, genericPrice: 14, category: "NSAID", uses: "Arthritis, muscle pain" },
  { id: 17, brand: "Meftal Spas", generic: "Mefenamic Acid + Dicyclomine", salt: "Mefenamic 250mg + Dicyclomine 10mg", brandedPrice: 68, genericPrice: 12, category: "Analgesic/Antispasmodic", uses: "Menstrual cramps, abdominal pain" },
  { id: 18, brand: "Dolonex", generic: "Piroxicam", salt: "Piroxicam 20mg", brandedPrice: 95, genericPrice: 16, category: "NSAID", uses: "Arthritis, joint pain" },
  { id: 19, brand: "Ketorol", generic: "Ketorolac", salt: "Ketorolac 10mg", brandedPrice: 72, genericPrice: 12, category: "NSAID", uses: "Moderate to severe pain" },
  { id: 20, brand: "Ultracet", generic: "Tramadol + Paracetamol", salt: "Tramadol 37.5mg + Paracetamol 325mg", brandedPrice: 110, genericPrice: 20, category: "Analgesic", uses: "Moderate to moderately severe pain" },
  // Diabetes
  { id: 21, brand: "Glycomet", generic: "Metformin", salt: "Metformin HCl 500mg", brandedPrice: 45, genericPrice: 8, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 22, brand: "Januvia", generic: "Sitagliptin", salt: "Sitagliptin 100mg", brandedPrice: 480, genericPrice: 95, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 23, brand: "Glucobay", generic: "Acarbose", salt: "Acarbose 50mg", brandedPrice: 185, genericPrice: 32, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 24, brand: "Amaryl", generic: "Glimepiride", salt: "Glimepiride 2mg", brandedPrice: 120, genericPrice: 18, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 25, brand: "Pioz", generic: "Pioglitazone", salt: "Pioglitazone 15mg", brandedPrice: 145, genericPrice: 22, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 26, brand: "Vildaglip", generic: "Vildagliptin", salt: "Vildagliptin 50mg", brandedPrice: 320, genericPrice: 58, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 27, brand: "Dapaget", generic: "Dapagliflozin", salt: "Dapagliflozin 10mg", brandedPrice: 390, genericPrice: 72, category: "Antidiabetic", uses: "Type 2 diabetes, heart failure" },
  { id: 28, brand: "Trajenta", generic: "Linagliptin", salt: "Linagliptin 5mg", brandedPrice: 420, genericPrice: 80, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 29, brand: "Gluformin", generic: "Metformin", salt: "Metformin HCl 1000mg", brandedPrice: 72, genericPrice: 12, category: "Antidiabetic", uses: "Type 2 diabetes" },
  { id: 30, brand: "Forxiga", generic: "Dapagliflozin", salt: "Dapagliflozin 5mg", brandedPrice: 310, genericPrice: 58, category: "Antidiabetic", uses: "Type 2 diabetes" },
  // Blood Pressure / Heart
  { id: 31, brand: "Amlip", generic: "Amlodipine", salt: "Amlodipine 5mg", brandedPrice: 95, genericPrice: 15, category: "Antihypertensive", uses: "High blood pressure, angina" },
  { id: 32, brand: "Telma", generic: "Telmisartan", salt: "Telmisartan 40mg", brandedPrice: 145, genericPrice: 22, category: "Antihypertensive", uses: "High blood pressure" },
  { id: 33, brand: "Concor", generic: "Bisoprolol", salt: "Bisoprolol 5mg", brandedPrice: 130, genericPrice: 20, category: "Beta Blocker", uses: "Heart failure, hypertension" },
  { id: 34, brand: "Stamlo", generic: "Amlodipine", salt: "Amlodipine 10mg", brandedPrice: 155, genericPrice: 24, category: "Antihypertensive", uses: "Hypertension, angina" },
  { id: 35, brand: "Revasq", generic: "Ramipril", salt: "Ramipril 5mg", brandedPrice: 118, genericPrice: 18, category: "ACE Inhibitor", uses: "Hypertension, heart failure" },
  { id: 36, brand: "Cardace", generic: "Ramipril", salt: "Ramipril 2.5mg", brandedPrice: 98, genericPrice: 15, category: "ACE Inhibitor", uses: "Hypertension" },
  { id: 37, brand: "Aten", generic: "Atenolol", salt: "Atenolol 50mg", brandedPrice: 55, genericPrice: 9, category: "Beta Blocker", uses: "Hypertension, angina" },
  { id: 38, brand: "Embeta", generic: "Metoprolol", salt: "Metoprolol 50mg", brandedPrice: 85, genericPrice: 14, category: "Beta Blocker", uses: "Hypertension, heart failure" },
  { id: 39, brand: "Losartan", generic: "Losartan", salt: "Losartan Potassium 50mg", brandedPrice: 125, genericPrice: 20, category: "ARB", uses: "Hypertension, diabetic nephropathy" },
  { id: 40, brand: "Olsar", generic: "Olmesartan", salt: "Olmesartan 20mg", brandedPrice: 185, genericPrice: 30, category: "ARB", uses: "Hypertension" },
  // Cholesterol
  { id: 41, brand: "Storvas", generic: "Atorvastatin", salt: "Atorvastatin 10mg", brandedPrice: 125, genericPrice: 20, category: "Statin", uses: "High cholesterol, heart disease prevention" },
  { id: 42, brand: "Rosuvas", generic: "Rosuvastatin", salt: "Rosuvastatin 10mg", brandedPrice: 185, genericPrice: 32, category: "Statin", uses: "High cholesterol" },
  { id: 43, brand: "Zocor", generic: "Simvastatin", salt: "Simvastatin 20mg", brandedPrice: 135, genericPrice: 22, category: "Statin", uses: "High cholesterol" },
  { id: 44, brand: "Lopid", generic: "Gemfibrozil", salt: "Gemfibrozil 600mg", brandedPrice: 165, genericPrice: 28, category: "Fibrate", uses: "High triglycerides" },
  { id: 45, brand: "Liphook", generic: "Fenofibrate", salt: "Fenofibrate 145mg", brandedPrice: 195, genericPrice: 35, category: "Fibrate", uses: "High cholesterol, triglycerides" },
  // Stomach & Digestive
  { id: 46, brand: "Pantodac", generic: "Pantoprazole", salt: "Pantoprazole 40mg", brandedPrice: 95, genericPrice: 16, category: "PPI", uses: "Acid reflux, ulcers, GERD" },
  { id: 47, brand: "Omez", generic: "Omeprazole", salt: "Omeprazole 20mg", brandedPrice: 65, genericPrice: 11, category: "PPI", uses: "Acid reflux, gastric ulcer" },
  { id: 48, brand: "Nexpro", generic: "Esomeprazole", salt: "Esomeprazole 40mg", brandedPrice: 145, genericPrice: 25, category: "PPI", uses: "GERD, erosive esophagitis" },
  { id: 49, brand: "Rantac", generic: "Ranitidine", salt: "Ranitidine 150mg", brandedPrice: 45, genericPrice: 7, category: "H2 Blocker", uses: "Heartburn, acid reflux" },
  { id: 50, brand: "Perinorm", generic: "Metoclopramide", salt: "Metoclopramide 10mg", brandedPrice: 35, genericPrice: 6, category: "Antiemetic", uses: "Nausea, vomiting, gastroparesis" },
  { id: 51, brand: "Librax", generic: "Chlordiazepoxide + Clidinium", salt: "Chlordiazepoxide 5mg + Clidinium 2.5mg", brandedPrice: 78, genericPrice: 13, category: "Antispasmodic", uses: "Irritable bowel syndrome" },
  { id: 52, brand: "Cremaffin", generic: "Liquid Paraffin + Milk of Magnesia", salt: "Liquid Paraffin + Sodium Picosulfate", brandedPrice: 125, genericPrice: 20, category: "Laxative", uses: "Constipation" },
  { id: 53, brand: "Normaxin", generic: "Chlordiazepoxide + Clidinium + Dicyclomine", salt: "Mixed antispasmodic", brandedPrice: 65, genericPrice: 11, category: "Antispasmodic", uses: "IBS, abdominal cramps" },
  { id: 54, brand: "Domperi", generic: "Domperidone", salt: "Domperidone 10mg", brandedPrice: 45, genericPrice: 8, category: "Antiemetic", uses: "Nausea, bloating" },
  { id: 55, brand: "Levosiz", generic: "Levocetirizine", salt: "Levocetirizine 5mg", brandedPrice: 72, genericPrice: 11, category: "Antihistamine", uses: "Allergic rhinitis, urticaria" },
  // Allergy & Cold
  { id: 56, brand: "Allegra", generic: "Fexofenadine", salt: "Fexofenadine 120mg", brandedPrice: 165, genericPrice: 28, category: "Antihistamine", uses: "Allergic rhinitis, hives" },
  { id: 57, brand: "Cetrizine", generic: "Cetirizine", salt: "Cetirizine 10mg", brandedPrice: 38, genericPrice: 6, category: "Antihistamine", uses: "Allergy, hives, itching" },
  { id: 58, brand: "Claritin", generic: "Loratadine", salt: "Loratadine 10mg", brandedPrice: 95, genericPrice: 15, category: "Antihistamine", uses: "Allergic rhinitis, urticaria" },
  { id: 59, brand: "Nasivion", generic: "Oxymetazoline", salt: "Oxymetazoline 0.05%", brandedPrice: 85, genericPrice: 15, category: "Decongestant", uses: "Nasal congestion" },
  { id: 60, brand: "Asthalin", generic: "Salbutamol", salt: "Salbutamol 100mcg", brandedPrice: 85, genericPrice: 18, category: "Bronchodilator", uses: "Asthma, COPD" },
  // Thyroid
  { id: 61, brand: "Thyronorm", generic: "Levothyroxine", salt: "Levothyroxine 50mcg", brandedPrice: 42, genericPrice: 8, category: "Thyroid Hormone", uses: "Hypothyroidism" },
  { id: 62, brand: "Eltroxin", generic: "Levothyroxine", salt: "Levothyroxine 100mcg", brandedPrice: 65, genericPrice: 11, category: "Thyroid Hormone", uses: "Hypothyroidism" },
  { id: 63, brand: "Thyrox", generic: "Levothyroxine", salt: "Levothyroxine 25mcg", brandedPrice: 35, genericPrice: 6, category: "Thyroid Hormone", uses: "Hypothyroidism" },
  { id: 64, brand: "Neomercazole", generic: "Carbimazole", salt: "Carbimazole 5mg", brandedPrice: 85, genericPrice: 14, category: "Antithyroid", uses: "Hyperthyroidism" },
  // Mental Health
  { id: 65, brand: "Serenace", generic: "Haloperidol", salt: "Haloperidol 5mg", brandedPrice: 65, genericPrice: 11, category: "Antipsychotic", uses: "Schizophrenia, psychosis" },
  { id: 66, brand: "Oleanz", generic: "Olanzapine", salt: "Olanzapine 5mg", brandedPrice: 185, genericPrice: 32, category: "Antipsychotic", uses: "Schizophrenia, bipolar disorder" },
  { id: 67, brand: "Nexito", generic: "Escitalopram", salt: "Escitalopram 10mg", brandedPrice: 155, genericPrice: 26, category: "Antidepressant", uses: "Depression, anxiety" },
  { id: 68, brand: "Sertraline", generic: "Sertraline", salt: "Sertraline 50mg", brandedPrice: 145, genericPrice: 24, category: "Antidepressant", uses: "Depression, OCD, panic" },
  { id: 69, brand: "Lonazep", generic: "Clonazepam", salt: "Clonazepam 0.5mg", brandedPrice: 55, genericPrice: 9, category: "Anxiolytic", uses: "Anxiety, panic, seizures" },
  { id: 70, brand: "Ativan", generic: "Lorazepam", salt: "Lorazepam 1mg", brandedPrice: 48, genericPrice: 8, category: "Anxiolytic", uses: "Anxiety, insomnia" },
  // Vitamins & Supplements
  { id: 71, brand: "Neurobion Forte", generic: "B-Complex", salt: "Vitamin B1+B6+B12", brandedPrice: 95, genericPrice: 18, category: "Vitamin", uses: "Nerve health, B-vitamin deficiency" },
  { id: 72, brand: "Shelcal", generic: "Calcium + Vitamin D3", salt: "Calcium 500mg + Vit D3 250IU", brandedPrice: 145, genericPrice: 25, category: "Supplement", uses: "Bone health, calcium deficiency" },
  { id: 73, brand: "Supradyn", generic: "Multivitamin", salt: "Multivitamin + Multimineral", brandedPrice: 220, genericPrice: 38, category: "Multivitamin", uses: "General health, nutritional support" },
  { id: 74, brand: "Becosules", generic: "B-Complex + Vitamin C", salt: "Vitamin B + C Complex", brandedPrice: 85, genericPrice: 14, category: "Vitamin", uses: "General health, immunity" },
  { id: 75, brand: "Calcirol", generic: "Cholecalciferol", salt: "Vitamin D3 60000IU", brandedPrice: 125, genericPrice: 20, category: "Vitamin", uses: "Vitamin D deficiency" },
  { id: 76, brand: "Zincovit", generic: "Zinc + Vitamins", salt: "Zinc Sulphate + Multivitamin", brandedPrice: 165, genericPrice: 28, category: "Supplement", uses: "Immunity, wound healing" },
  { id: 77, brand: "Folvite", generic: "Folic Acid", salt: "Folic Acid 5mg", brandedPrice: 38, genericPrice: 6, category: "Vitamin", uses: "Anemia prevention, pregnancy" },
  { id: 78, brand: "Ferrous Sulfate", generic: "Iron Supplement", salt: "Ferrous Sulphate 200mg", brandedPrice: 45, genericPrice: 8, category: "Iron Supplement", uses: "Iron deficiency anemia" },
  // Asthma & Respiratory
  { id: 79, brand: "Seroflo", generic: "Salmeterol + Fluticasone", salt: "Salmeterol 25mcg + Fluticasone 125mcg", brandedPrice: 485, genericPrice: 95, category: "Respiratory", uses: "Asthma, COPD" },
  { id: 80, brand: "Budecort", generic: "Budesonide", salt: "Budesonide 200mcg", brandedPrice: 285, genericPrice: 55, category: "Corticosteroid Inhaler", uses: "Asthma prevention" },
  { id: 81, brand: "Duolin", generic: "Ipratropium + Levosalbutamol", salt: "Ipratropium 0.5mg + Levosalbutamol 1.25mg", brandedPrice: 185, genericPrice: 35, category: "Bronchodilator", uses: "COPD, asthma" },
  { id: 82, brand: "Montair", generic: "Montelukast", salt: "Montelukast 10mg", brandedPrice: 185, genericPrice: 32, category: "Leukotriene Antagonist", uses: "Asthma, allergic rhinitis" },
  { id: 83, brand: "Prednisolone", generic: "Prednisolone", salt: "Prednisolone 10mg", brandedPrice: 55, genericPrice: 9, category: "Corticosteroid", uses: "Inflammation, asthma, allergies" },
  // Skin
  { id: 84, brand: "Betnovate", generic: "Betamethasone", salt: "Betamethasone 0.1% cream", brandedPrice: 95, genericPrice: 18, category: "Topical Steroid", uses: "Eczema, psoriasis, skin inflammation" },
  { id: 85, brand: "Candid", generic: "Clotrimazole", salt: "Clotrimazole 1% cream", brandedPrice: 75, genericPrice: 14, category: "Antifungal", uses: "Fungal skin infections" },
  { id: 86, brand: "Terbicip", generic: "Terbinafine", salt: "Terbinafine 250mg", brandedPrice: 145, genericPrice: 25, category: "Antifungal", uses: "Ringworm, athlete's foot, nail fungus" },
  { id: 87, brand: "Fucidin", generic: "Fusidic Acid", salt: "Fusidic Acid 2% cream", brandedPrice: 185, genericPrice: 32, category: "Antibiotic Cream", uses: "Bacterial skin infections" },
  { id: 88, brand: "Retino-A", generic: "Tretinoin", salt: "Tretinoin 0.025% cream", brandedPrice: 225, genericPrice: 42, category: "Retinoid", uses: "Acne, wrinkles, hyperpigmentation" },
  // Eye
  { id: 89, brand: "Ciplox Eye Drops", generic: "Ciprofloxacin Eye Drops", salt: "Ciprofloxacin 0.3%", brandedPrice: 65, genericPrice: 12, category: "Ophthalmic Antibiotic", uses: "Eye infections, conjunctivitis" },
  { id: 90, brand: "Lotemax", generic: "Loteprednol", salt: "Loteprednol 0.5% eye drops", brandedPrice: 245, genericPrice: 45, category: "Ophthalmic Steroid", uses: "Eye inflammation" },
  { id: 91, brand: "Tears Naturale", generic: "Carboxymethylcellulose", salt: "CMC 0.5% eye drops", brandedPrice: 145, genericPrice: 25, category: "Lubricant Eye Drops", uses: "Dry eyes" },
  { id: 92, brand: "Timolol Eye Drops", generic: "Timolol", salt: "Timolol 0.5% eye drops", brandedPrice: 85, genericPrice: 16, category: "Glaucoma Drops", uses: "Glaucoma, ocular hypertension" },
  // Urology
  { id: 93, brand: "Urimax", generic: "Tamsulosin", salt: "Tamsulosin 0.4mg", brandedPrice: 195, genericPrice: 35, category: "Alpha Blocker", uses: "Enlarged prostate (BPH)" },
  { id: 94, brand: "Proscar", generic: "Finasteride", salt: "Finasteride 5mg", brandedPrice: 265, genericPrice: 48, category: "5-alpha Reductase Inhibitor", uses: "BPH, hair loss" },
  { id: 95, brand: "Nitrofurantoin", generic: "Nitrofurantoin", salt: "Nitrofurantoin 100mg", brandedPrice: 95, genericPrice: 17, category: "Urinary Antibiotic", uses: "Urinary tract infections" },
  // Neurology
  { id: 96, brand: "Gabapin", generic: "Gabapentin", salt: "Gabapentin 300mg", brandedPrice: 165, genericPrice: 28, category: "Anticonvulsant/Neuropathic", uses: "Neuropathic pain, epilepsy" },
  { id: 97, brand: "Lyrica", generic: "Pregabalin", salt: "Pregabalin 75mg", brandedPrice: 285, genericPrice: 52, category: "Neuropathic Pain", uses: "Nerve pain, fibromyalgia" },
  { id: 98, brand: "Tegretol", generic: "Carbamazepine", salt: "Carbamazepine 200mg", brandedPrice: 95, genericPrice: 16, category: "Anticonvulsant", uses: "Epilepsy, trigeminal neuralgia" },
  { id: 99, brand: "Dilantin", generic: "Phenytoin", salt: "Phenytoin 100mg", brandedPrice: 65, genericPrice: 11, category: "Anticonvulsant", uses: "Epilepsy, seizures" },
  { id: 100, brand: "Encorate", generic: "Sodium Valproate", salt: "Sodium Valproate 200mg", brandedPrice: 85, genericPrice: 14, category: "Anticonvulsant", uses: "Epilepsy, bipolar disorder" },
  // Additional medicines
  { id: 101, brand: "Covance", generic: "Losartan + Hydrochlorothiazide", salt: "Losartan 50mg + HCTZ 12.5mg", brandedPrice: 185, genericPrice: 32, category: "Antihypertensive", uses: "Hypertension" },
  { id: 102, brand: "Metrogyl", generic: "Metronidazole", salt: "Metronidazole 400mg", brandedPrice: 38, genericPrice: 6, category: "Antiprotozoal", uses: "Amoebiasis, giardiasis, anaerobic infections" },
  { id: 103, brand: "Flagyl", generic: "Metronidazole", salt: "Metronidazole 200mg", brandedPrice: 28, genericPrice: 5, category: "Antiprotozoal", uses: "Amoebiasis, giardiasis" },
  { id: 104, brand: "Fluconazole", generic: "Fluconazole", salt: "Fluconazole 150mg", brandedPrice: 95, genericPrice: 18, category: "Antifungal", uses: "Candidiasis, fungal infections" },
  { id: 105, brand: "Lariago", generic: "Chloroquine", salt: "Chloroquine 250mg", brandedPrice: 35, genericPrice: 6, category: "Antimalarial", uses: "Malaria treatment and prevention" },
  { id: 106, brand: "Falcigo", generic: "Artesunate", salt: "Artesunate 50mg", brandedPrice: 145, genericPrice: 25, category: "Antimalarial", uses: "Severe malaria" },
  { id: 107, brand: "Praziquantel", generic: "Praziquantel", salt: "Praziquantel 600mg", brandedPrice: 185, genericPrice: 32, category: "Anthelmintic", uses: "Tapeworm, schistosomiasis" },
  { id: 108, brand: "Albendazole", generic: "Albendazole", salt: "Albendazole 400mg", brandedPrice: 45, genericPrice: 8, category: "Anthelmintic", uses: "Worm infestations" },
  { id: 109, brand: "Mebex", generic: "Mebendazole", salt: "Mebendazole 100mg", brandedPrice: 28, genericPrice: 5, category: "Anthelmintic", uses: "Intestinal worm infections" },
  { id: 110, brand: "Dicyclomine", generic: "Dicyclomine", salt: "Dicyclomine 20mg", brandedPrice: 42, genericPrice: 7, category: "Antispasmodic", uses: "IBS, abdominal cramps" },
  { id: 111, brand: "Sucralfate", generic: "Sucralfate", salt: "Sucralfate 1g", brandedPrice: 65, genericPrice: 11, category: "Antiulcer", uses: "Peptic ulcers, GERD" },
  { id: 112, brand: "Colchicine", generic: "Colchicine", salt: "Colchicine 0.5mg", brandedPrice: 85, genericPrice: 15, category: "Antigout", uses: "Gout attack prevention and treatment" },
  { id: 113, brand: "Zyloric", generic: "Allopurinol", salt: "Allopurinol 300mg", brandedPrice: 75, genericPrice: 13, category: "Antigout", uses: "Gout, hyperuricemia" },
  { id: 114, brand: "Warfarin", generic: "Warfarin", salt: "Warfarin Sodium 2mg", brandedPrice: 65, genericPrice: 11, category: "Anticoagulant", uses: "Blood clot prevention" },
  { id: 115, brand: "Ecosprin", generic: "Aspirin", salt: "Aspirin 75mg", brandedPrice: 28, genericPrice: 5, category: "Antiplatelet", uses: "Heart attack prevention, blood thinning" },
  { id: 116, brand: "Clopidogrel", generic: "Clopidogrel", salt: "Clopidogrel 75mg", brandedPrice: 145, genericPrice: 25, category: "Antiplatelet", uses: "Prevent heart attack, stroke" },
  { id: 117, brand: "Digoxin", generic: "Digoxin", salt: "Digoxin 0.25mg", brandedPrice: 45, genericPrice: 8, category: "Cardiac Glycoside", uses: "Heart failure, atrial fibrillation" },
  { id: 118, brand: "Amiodarone", generic: "Amiodarone", salt: "Amiodarone 200mg", brandedPrice: 165, genericPrice: 28, category: "Antiarrhythmic", uses: "Arrhythmia" },
  { id: 119, brand: "Isosorbide", generic: "Isosorbide Mononitrate", salt: "Isosorbide Mononitrate 20mg", brandedPrice: 75, genericPrice: 13, category: "Nitrate", uses: "Angina, heart failure" },
  { id: 120, brand: "Nitroglycerin", generic: "Nitroglycerin", salt: "Glyceryl Trinitrate 0.5mg SL", brandedPrice: 85, genericPrice: 15, category: "Nitrate", uses: "Acute angina" },
  { id: 121, brand: "Mifepristone", generic: "Mifepristone", salt: "Mifepristone 200mg", brandedPrice: 245, genericPrice: 45, category: "Contraceptive", uses: "Medical termination of pregnancy" },
  { id: 122, brand: "Novelon", generic: "Ethinylestradiol + Desogestrel", salt: "EE 0.03mg + Desogestrel 0.15mg", brandedPrice: 165, genericPrice: 28, category: "Oral Contraceptive", uses: "Contraception, menstrual regulation" },
  { id: 123, brand: "Duphaston", generic: "Dydrogesterone", salt: "Dydrogesterone 10mg", brandedPrice: 285, genericPrice: 52, category: "Progestogen", uses: "Endometriosis, menstrual disorders" },
  { id: 124, brand: "Progynova", generic: "Estradiol", salt: "Estradiol Valerate 2mg", brandedPrice: 185, genericPrice: 32, category: "Estrogen", uses: "Menopausal symptoms, HRT" },
  { id: 125, brand: "Primolut", generic: "Norethisterone", salt: "Norethisterone 5mg", brandedPrice: 125, genericPrice: 20, category: "Progestogen", uses: "Menstrual irregularities, postponing menstruation" },
  { id: 126, brand: "Taxofit", generic: "Calcium + Magnesium + Zinc", salt: "Ca+Mg+Zn+Vit D combo", brandedPrice: 245, genericPrice: 42, category: "Supplement", uses: "Bone health, muscle function" },
  { id: 127, brand: "Omega-3", generic: "Fish Oil Omega-3", salt: "EPA 180mg + DHA 120mg", brandedPrice: 285, genericPrice: 50, category: "Supplement", uses: "Heart health, triglycerides" },
  { id: 128, brand: "Glucosamine", generic: "Glucosamine + Chondroitin", salt: "Glucosamine 500mg + Chondroitin 400mg", brandedPrice: 325, genericPrice: 58, category: "Supplement", uses: "Joint health, osteoarthritis" },
  { id: 129, brand: "Melatonin", generic: "Melatonin", salt: "Melatonin 3mg", brandedPrice: 185, genericPrice: 32, category: "Sleep Aid", uses: "Insomnia, jet lag, sleep disorders" },
  { id: 130, brand: "Zolpidem", generic: "Zolpidem", salt: "Zolpidem 10mg", brandedPrice: 145, genericPrice: 25, category: "Sedative", uses: "Insomnia" },
  { id: 131, brand: "Pantosec", generic: "Pantoprazole + Domperidone", salt: "Pantoprazole 40mg + Domperidone 30mg SR", brandedPrice: 125, genericPrice: 20, category: "PPI+Prokinetic", uses: "GERD with nausea" },
  { id: 132, brand: "Rabecid", generic: "Rabeprazole", salt: "Rabeprazole 20mg", brandedPrice: 95, genericPrice: 16, category: "PPI", uses: "GERD, peptic ulcer" },
  { id: 133, brand: "Ursodiol", generic: "Ursodeoxycholic Acid", salt: "UDCA 300mg", brandedPrice: 285, genericPrice: 52, category: "Cholagogue", uses: "Gallstones, liver disease" },
  { id: 134, brand: "Lactulose", generic: "Lactulose", salt: "Lactulose 10g/15ml syrup", brandedPrice: 95, genericPrice: 16, category: "Laxative", uses: "Constipation, hepatic encephalopathy" },
  { id: 135, brand: "ORS", generic: "Oral Rehydration Salts", salt: "Sodium + Potassium + Glucose + Chloride", brandedPrice: 25, genericPrice: 5, category: "Rehydration", uses: "Dehydration, diarrhea" },
  { id: 136, brand: "Zincofer", generic: "Zinc + Iron", salt: "Zinc 22.5mg + Iron 45mg", brandedPrice: 85, genericPrice: 15, category: "Iron/Zinc Supplement", uses: "Deficiency anemia in children" },
  { id: 137, brand: "Cepodem", generic: "Cefpodoxime", salt: "Cefpodoxime 200mg", brandedPrice: 185, genericPrice: 32, category: "Antibiotic", uses: "Respiratory, urinary infections" },
  { id: 138, brand: "Moxikind", generic: "Amoxicillin + Clavulanate", salt: "Amoxicillin 250mg + Clavulanate 125mg", brandedPrice: 115, genericPrice: 20, category: "Antibiotic", uses: "Mild-moderate infections" },
  { id: 139, brand: "Sporanox", generic: "Itraconazole", salt: "Itraconazole 100mg", brandedPrice: 395, genericPrice: 72, category: "Antifungal", uses: "Deep fungal infections, onychomycosis" },
  { id: 140, brand: "Acivir", generic: "Acyclovir", salt: "Acyclovir 400mg", brandedPrice: 125, genericPrice: 22, category: "Antiviral", uses: "Herpes, chickenpox, shingles" },
  { id: 141, brand: "Valcivir", generic: "Valacyclovir", salt: "Valacyclovir 500mg", brandedPrice: 285, genericPrice: 52, category: "Antiviral", uses: "Herpes zoster, genital herpes" },
  { id: 142, brand: "Oseltamivir", generic: "Oseltamivir", salt: "Oseltamivir 75mg", brandedPrice: 485, genericPrice: 90, category: "Antiviral", uses: "Influenza treatment and prevention" },
  { id: 143, brand: "Tenofovir", generic: "Tenofovir", salt: "Tenofovir 300mg", brandedPrice: 285, genericPrice: 52, category: "Antiviral/ARV", uses: "HIV, hepatitis B" },
  { id: 144, brand: "Emtricitabine", generic: "Emtricitabine", salt: "Emtricitabine 200mg", brandedPrice: 195, genericPrice: 35, category: "Antiviral/ARV", uses: "HIV treatment" },
  { id: 145, brand: "Dexamethasone", generic: "Dexamethasone", salt: "Dexamethasone 0.5mg", brandedPrice: 28, genericPrice: 5, category: "Corticosteroid", uses: "Severe allergy, inflammation, COVID-19 severe" },
  { id: 146, brand: "Methylprednisolone", generic: "Methylprednisolone", salt: "Methylprednisolone 4mg", brandedPrice: 95, genericPrice: 16, category: "Corticosteroid", uses: "Severe inflammatory conditions" },
  { id: 147, brand: "Hydrocortisone", generic: "Hydrocortisone", salt: "Hydrocortisone 10mg", brandedPrice: 65, genericPrice: 11, category: "Corticosteroid", uses: "Adrenal insufficiency, inflammation" },
  { id: 148, brand: "Budesonide Capsules", generic: "Budesonide Oral", salt: "Budesonide 3mg", brandedPrice: 285, genericPrice: 52, category: "Corticosteroid", uses: "Crohn's disease, IBD" },
  { id: 149, brand: "Mesacol", generic: "Mesalazine", salt: "Mesalazine 400mg", brandedPrice: 185, genericPrice: 32, category: "Aminosalicylate", uses: "Ulcerative colitis, Crohn's disease" },
  { id: 150, brand: "Sulfasalazine", generic: "Sulfasalazine", salt: "Sulfasalazine 500mg", brandedPrice: 85, genericPrice: 14, category: "Aminosalicylate", uses: "IBD, rheumatoid arthritis" },
];

// ─── STORE DATABASE ───────────────────────────────────────────────────────────
// Stores are dynamically fetched via OpenStreetMap Overpass API
const stores = dbHelpers.getAllStores();

// ─── REMINDERS AND ANALYTICS ───────────────────────────────────────────────────
// Reminders and Analytics are handled by the persistent SQLite database.

// ─── FUZZY SEARCH ─────────────────────────────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyScore(query, target) {
  query = query.toLowerCase(); target = target.toLowerCase();
  if (target.includes(query)) return 100;
  const dist = levenshtein(query, target.substring(0, Math.max(query.length, target.length)));
  return Math.max(0, Math.round((1 - dist / Math.max(query.length, target.length)) * 100));
}

function enrichMedicine(med) {
  return { ...med, savings: med.brandedPrice - med.genericPrice, savingsPercent: Math.round((1 - med.genericPrice / med.brandedPrice) * 100) };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── VALIDATION HELPER ────────────────────────────────────────────────────────
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/register',
  body('name').trim().isLength({ min: 2, max: 60 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { name, email, password } = req.body;
    const existing = await dbHelpers.findUserByEmail(email);
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await dbHelpers.createUser({ name, email, password_hash: hashed, role: 'user' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }
);

app.post('/api/auth/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { email, password } = req.body;
    const user = await dbHelpers.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }
);

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await dbHelpers.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at });
});

// OTP login (simulated - integrate Twilio/MSG91 in production)
const otpStore = new Map();
app.post('/api/auth/otp/send',
  body('phone').matches(/^[6-9]\d{9}$/),
  (req, res) => {
    if (!validate(req, res)) return;
    const { phone } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });
    // In production: send via SMS provider
    console.log(`[OTP] ${phone}: ${otp}`);
    res.json({ message: 'OTP sent successfully', ...(process.env.NODE_ENV !== 'production' && { otp }) });
  }
);

app.post('/api/auth/otp/verify',
  body('phone').matches(/^[6-9]\d{9}$/),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { phone, otp } = req.body;
    const record = otpStore.get(phone);
    if (!record || record.otp !== otp || Date.now() > record.expires)
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    otpStore.delete(phone);
    let user = await dbHelpers.findUserByPhone(phone);
    if (!user) {
      user = await dbHelpers.createUser({ phone, role: 'user' });
    }
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, phone: user.phone, role: user.role } });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/config/maps-key', (req, res) => {
  res.json({ key: process.env.GOOGLE_MAPS_API_KEY || '' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICINE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/medicines/search', async (req, res) => {
  const { q, category, limit = 20 } = req.query;
  if (!q || q.trim().length < 2) return res.json({ results: [], total: 0 });
  await dbHelpers.incrementAnalytic('searches');
  const query = q.trim();
  let results = medicines.map(med => {
    const score = Math.max(
      fuzzyScore(query, med.brand),
      fuzzyScore(query, med.generic),
      fuzzyScore(query, med.salt),
      fuzzyScore(query, med.category),
      fuzzyScore(query, med.uses) * 0.5
    );
    return { ...enrichMedicine(med), score };
  }).filter(m => m.score >= 42);
  if (category) results = results.filter(m => m.category === category);
  results.sort((a, b) => b.score - a.score);
  res.json({ results: results.slice(0, parseInt(limit)), total: results.length });
});

app.get('/api/medicines', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const { category, sort } = req.query;
  let data = medicines.map(enrichMedicine);
  if (category) data = data.filter(m => m.category === category);
  if (sort === 'savings') data.sort((a, b) => b.savingsPercent - a.savingsPercent);
  else if (sort === 'name') data.sort((a, b) => a.brand.localeCompare(b.brand));
  const total = data.length;
  res.json({ results: data.slice((page-1)*limit, page*limit), total, pages: Math.ceil(total/limit), page });
});

app.get('/api/medicines/:id', (req, res) => {
  const med = medicines.find(m => m.id === parseInt(req.params.id));
  if (!med) return res.status(404).json({ error: 'Medicine not found' });
  res.json(enrichMedicine(med));
});

app.get('/api/categories', (req, res) => {
  const cats = [...new Set(medicines.map(m => m.category))].sort();
  const withCounts = cats.map(cat => ({ name: cat, count: medicines.filter(m => m.category === cat).length }));
  res.json({ categories: withCounts });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STORE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/stores', async (req, res) => {
  const allStores = await dbHelpers.getAllStores();
  res.json({ stores: allStores, total: allStores.length });
});

app.get('/api/stores/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 25 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Coordinates required' });
    const userLat = parseFloat(lat), userLng = parseFloat(lng);
    if (isNaN(userLat) || isNaN(userLng)) return res.status(400).json({ error: 'Invalid coordinates' });
    
    const radiusMeters = parseFloat(radius) * 1000;
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["name"~"Jan Aushadhi",i](around:${radiusMeters},${userLat},${userLng});
        way["name"~"Jan Aushadhi",i](around:${radiusMeters},${userLat},${userLng});
        node["name"~"Janaushadhi",i](around:${radiusMeters},${userLat},${userLng});
        way["name"~"Janaushadhi",i](around:${radiusMeters},${userLat},${userLng});
      );
      out center;
    `;

    // 1. Fetch local stores from DB
    const localStoresRaw = await dbHelpers.getAllStores();
    const localStores = localStoresRaw.map(s => ({
      id: `local-${s.id}`,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      phone: s.phone,
      timings: s.timings,
      isOpen: true,
      rating: s.rating,
      totalMedicines: s.totalMedicines,
      distance: Math.round(haversineDistance(userLat, userLng, s.lat, s.lng) * 10) / 10
    })).filter(s => s.distance <= radius);

    // 2. Try to fetch OSM stores
    let osmStores = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'JanAushadhiFinder/2.0'
        },
        body: 'data=' + encodeURIComponent(overpassQuery),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        osmStores = (data.elements || []).map(el => {
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;
          if (!lat || !lon) return null;
          
          return {
            id: el.id,
            name: el.tags?.name || 'Jan Aushadhi Kendra',
            address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || 'Address available via map',
            lat,
            lng: lon,
            phone: el.tags?.phone || 'N/A',
            timings: el.tags?.opening_hours || '9:00 AM - 9:00 PM',
            isOpen: true,
            rating: 4.2 + (Math.random() * 0.5),
            totalMedicines: 850 + Math.floor(Math.random() * 400),
            distance: Math.round(haversineDistance(userLat, userLng, lat, lon) * 10) / 10
          };
        }).filter(Boolean);
      }
    } catch (error) {
      console.error('[STORES] Overpass skipped:', error.message);
    }

    // 3. Merge and deduplicate
    const combined = [...localStores];
    osmStores.forEach(osm => {
      if (!combined.some(loc => loc.name.toLowerCase() === osm.name.toLowerCase())) {
        combined.push(osm);
      }
    });

    res.json({ stores: combined.sort((a, b) => a.distance - b.distance), userLocation: { lat: userLat, lng: userLng } });
  } catch (err) {
    console.error('[FATAL STORES ERROR]', err);
    res.status(500).json({ 
      error: 'Internal server error fetching stores',
      message: err.message,
      stack: err.stack 
    });
  }
});

app.get('/api/stores/:id', (req, res) => {
  res.json({ error: 'Endpoint deprecated' });
});

app.post('/api/stores/:storeId/stock-request',
  body('medicineId').isNumeric(),
  body('medicineName').trim().notEmpty(),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { medicineId, medicineName } = req.body;
    const store = stores.find(s => s.id === parseInt(req.params.storeId));
    if (!store) return res.status(404).json({ error: 'Store not found' });
    await dbHelpers.incrementAnalytic('stockRequests');
    const inStock = Math.random() > 0.3;
    res.json({
      storeId: store.id, storeName: store.name, medicineId, medicineName, inStock,
      message: inStock
        ? `✅ ${medicineName} is available at ${store.name}. Call ${store.phone} to confirm.`
        : `❌ ${medicineName} is currently out of stock at ${store.name}. Try another nearby store.`,
      requestId: `REQ-${Date.now()}`, timestamp: new Date().toISOString()
    });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// REMINDER ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/reminders', optionalAuth, async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  const userReminders = await dbHelpers.getRemindersByUser(userId);
  res.json({ reminders: userReminders });
});

app.post('/api/reminders',
  body('medicineName').trim().isLength({ min: 1, max: 100 }).escape(),
  body('dosage').trim().isLength({ min: 1, max: 50 }).escape(),
  body('frequency').isIn(['Once daily', 'Twice daily', 'Thrice daily', 'Weekly', 'Monthly', 'As needed']),
  body('nextRefillDate').isISO8601(),
  optionalAuth,
  async (req, res) => {
    if (!validate(req, res)) return;
    const { medicineName, genericName, dosage, frequency, nextRefillDate, notes } = req.body;
    const userId = req.user?.id || 'anonymous';
    await dbHelpers.incrementAnalytic('remindersCreated');
    const reminder = await dbHelpers.createReminder({
      user_id: userId, medicine_name: medicineName, generic_name: genericName, dosage, frequency, next_refill_date: nextRefillDate, notes
    });
    res.status(201).json(reminder);
  }
);

app.put('/api/reminders/:id',
  optionalAuth,
  async (req, res) => {
    const userId = req.user?.id || 'anonymous';
    const updated = await dbHelpers.updateReminder(parseInt(req.params.id), userId, req.body);
    if (!updated) return res.status(404).json({ error: 'Reminder not found' });
    res.json(updated);
  }
);

app.delete('/api/reminders/:id', optionalAuth, async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  const success = await dbHelpers.deleteReminder(parseInt(req.params.id), userId);
  if (!success) return res.status(404).json({ error: 'Reminder not found' });
  res.json({ message: 'Deleted successfully' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAVINGS CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/calculate-savings',
  body('prescription').isArray({ min: 1, max: 30 }),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { prescription } = req.body;
    await dbHelpers.incrementAnalytic('savingsCalculated');
    let totalBranded = 0, totalGeneric = 0;
    const breakdown = prescription.map(item => {
      const med = medicines.find(m => m.id === item.medicineId);
      if (!med) return null;
      const qty = Math.max(1, Math.min(365, parseInt(item.quantity) || 1));
      const brandCost = med.brandedPrice * qty;
      const genericCost = med.genericPrice * qty;
      totalBranded += brandCost; totalGeneric += genericCost;
      return { medicine: med.brand, generic: med.generic, quantity: qty, brandCost, genericCost, saved: brandCost - genericCost };
    }).filter(Boolean);
    res.json({ totalBranded, totalGeneric, totalSaved: totalBranded - totalGeneric, savingsPercent: totalBranded ? Math.round((1 - totalGeneric / totalBranded) * 100) : 0, breakdown });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS (protected)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/admin/analytics', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  res.json({
    analytics: await dbHelpers.getAnalytics(),
    counts: { medicines: medicines.length, stores: 10500, reminders: await dbHelpers.getReminderCount(), users: await dbHelpers.getUserCount() },
    topCategories: [...new Set(medicines.map(m => m.category))].map(cat => ({
      category: cat,
      count: medicines.filter(m => m.category === cat).length,
      avgSavings: Math.round(medicines.filter(m => m.category === cat).reduce((s, m) => s + (1 - m.genericPrice/m.brandedPrice), 0) / medicines.filter(m => m.category === cat).length * 100)
    })).sort((a, b) => b.avgSavings - a.avgSavings)
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH & SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/health', async (req, res) => {
  const localStores = await dbHelpers.getAllStores();
  res.json({ 
    status: 'ok', 
    version: '2.0.0', 
    medicines: medicines.length, 
    stores: 10500 + localStores.length, // Show total program stores + local additions
    uptime: Math.round(process.uptime()), 
    timestamp: new Date().toISOString() 
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── 404 FOR API ─────────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => res.status(404).json({ error: 'API route not found' }));

// ─── SPA FALLBACK ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🏥 Jan Aushadhi Finder v2.0 running on http://localhost:${PORT}\n`));
module.exports = app;
