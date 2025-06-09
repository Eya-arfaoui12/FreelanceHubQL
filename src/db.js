const sqlite3 = require('sqlite3').verbose();
   const path = require('path');

   // Chemin vers le fichier de la base de données
   const dbPath = path.join(__dirname, '../db/freelancehub.db');

   const db = new sqlite3.Database(dbPath);

   db.serialize(() => {
     db.run(`
       CREATE TABLE IF NOT EXISTS utilisateurs (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         nom TEXT NOT NULL,
         email TEXT NOT NULL UNIQUE, -- Ajout de UNIQUE pour éviter les doublons d'email
         motDePasse TEXT NOT NULL,   -- Champ pour le mot de passe haché
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

     // Données initiales avec mot de passe haché (à générer avec bcrypt)
     db.run(`
       INSERT OR IGNORE INTO utilisateurs (nom, email, motDePasse, telephone)
       VALUES ('Jean Dupont', 'jean.dupont@example.com', '$2b$10$XDK3u3w3v5s2x3y4z5v6w.O7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d', '0123456789')
     `);

     db.run(`
       INSERT OR IGNORE INTO profils (utilisateurId, competences, liensProfessionnels)
       VALUES (1, '["JavaScript", "Node.js"]', '["https://linkedin.com/in/jeandupont"]')
     `);
   });

   module.exports = db;