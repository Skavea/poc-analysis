/**
 * API Route: Delete Segment
 * ==========================
 * 
 * Endpoint pour supprimer un segment d'analyse
 * Seul le dernier segment créé (created_at le plus récent) peut être supprimé
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(databaseUrl);

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('id');
    const streamId = searchParams.get('streamId');

    if (!segmentId || !streamId) {
      return NextResponse.json(
        { error: 'Segment ID and Stream ID are required' },
        { status: 400 }
      );
    }

    // Vérifier que le segment existe et appartient au stream
    const segment = await sql`
      SELECT id, created_at, stock_data_id
      FROM analysis_results
      WHERE id = ${segmentId} AND stock_data_id = ${streamId}
    `;

    if (segment.length === 0) {
      return NextResponse.json(
        { error: 'Segment not found or does not belong to this stream' },
        { status: 404 }
      );
    }

    // Vérifier que c'est le dernier segment créé (created_at le plus récent) pour ce stream
    const lastSegment = await sql`
      SELECT id, created_at
      FROM analysis_results
      WHERE stock_data_id = ${streamId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (lastSegment.length === 0 || lastSegment[0].id !== segmentId) {
      return NextResponse.json(
        { error: 'Only the last created segment can be deleted' },
        { status: 403 }
      );
    }

    // Vérifier que le stream n'est pas terminé
    const stream = await sql`
      SELECT terminated
      FROM stock_data
      WHERE id = ${streamId}
    `;

    if (stream.length === 0) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    if (stream[0].terminated) {
      return NextResponse.json(
        { error: 'Cannot delete segments from a terminated stream' },
        { status: 403 }
      );
    }

    // Supprimer le segment
    await sql`
      DELETE FROM analysis_results
      WHERE id = ${segmentId}
    `;

    console.log(`✅ Segment ${segmentId} supprimé du stream ${streamId}`);

    return NextResponse.json({
      success: true,
      message: 'Segment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting segment:', error);
    return NextResponse.json(
      { error: 'Failed to delete segment' },
      { status: 500 }
    );
  }
}

