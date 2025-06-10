const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Création du dossier db s'il n'existe pas
const dbDir = path.join(__dirname, '../db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Chemin vers le fichier de la base de données
const dbPath = path.join(dbDir, 'freelancehub.db');

// Connexion à la base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à SQLite :', err.message);
  } else {
    console.log('Connexion à la base de données SQLite réussie.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      motDePasse TEXT NOT NULL,
      telephone TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profils (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      utilisateurId INTEGER NOT NULL,
      competences TEXT NOT NULL,
      liensProfessionnels TEXT NOT NULL,
      FOREIGN KEY (utilisateurId) REFERENCES utilisateurs(id)
    )
  `);

  // Données initiales
  db.run(`
    INSERT OR IGNORE INTO utilisateurs (id, nom, email, motDePasse, telephone)
    VALUES (1, 'Jean Dupont', 'jean.dupont@example.com', '$2b$10$XDK3u3w3v5s2x3y4z5v6w.O7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d', '0123456789')
  `);

  db.run(`
    INSERT OR IGNORE INTO profils (utilisateurId, competences, liensProfessionnels)
    VALUES (1, '["JavaScript", "Node.js"]', '["https://linkedin.com/in/jeandupont"]')
  `);
});

module.exports = db;