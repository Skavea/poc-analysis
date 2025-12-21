/**
 * API Route: Terminate Stream
 * ============================
 * 
 * Endpoint pour marquer un stream comme terminé
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(databaseUrl);

export async function POST(request: NextRequest) {
  try {
    const { streamId } = await request.json();

    if (!streamId) {
      return NextResponse.json(
        { error: 'Stream ID is required' },
        { status: 400 }
      );
    }

    // Vérifier que le stream existe
    const stream = await sql`
      SELECT id, terminated
      FROM stock_data
      WHERE id = ${streamId}
    `;

    if (stream.length === 0) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Marquer le stream comme terminé
    await sql`
      UPDATE stock_data
      SET terminated = true
      WHERE id = ${streamId}
    `;

    console.log(`✅ Stream ${streamId} marqué comme terminé`);

    return NextResponse.json({
      success: true,
      message: 'Stream marked as terminated'
    });

  } catch (error) {
    console.error('Error terminating stream:', error);
    return NextResponse.json(
      { error: 'Failed to terminate stream' },
      { status: 500 }
    );
  }
}

