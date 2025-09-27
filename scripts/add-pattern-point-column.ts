#!/usr/bin/env tsx

/**
 * Script: Add Pattern Point Column
 * ================================
 * 
 * Adds the pattern_point column to the analysis_results table
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Configuration de la base de données
const sql_query = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_query);

async function addPatternPointColumn() {
  try {
    console.log('🔄 Adding pattern_point column to analysis_results table...');
    
    // Vérifier si la colonne existe déjà
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analysis_results' 
      AND column_name = 'pattern_point'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Column pattern_point already exists');
      return;
    }
    
    // Ajouter la colonne
    await db.execute(sql`
      ALTER TABLE analysis_results 
      ADD COLUMN pattern_point VARCHAR(255)
    `);
    
    // Ajouter un commentaire
    await db.execute(sql`
      COMMENT ON COLUMN analysis_results.pattern_point IS 'Timestamp of the selected pattern point. NULL if no pattern selected, timestamp if pattern point was selected.'
    `);
    
    console.log('✅ Successfully added pattern_point column');
    
    // Vérifier que la colonne a été ajoutée
    const verifyColumn = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'analysis_results' 
      AND column_name = 'pattern_point'
    `);
    
    console.log('📋 Column details:', verifyColumn.rows[0]);
    
  } catch (error) {
    console.error('❌ Error adding pattern_point column:', error);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  addPatternPointColumn()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addPatternPointColumn };
