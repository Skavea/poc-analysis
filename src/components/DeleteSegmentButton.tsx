/**
 * Client Component: Delete Segment Button
 * =======================================
 * 
 * Bouton pour supprimer un segment (uniquement le dernier créé)
 */

'use client';

import { useState } from 'react';
import { Button, IconButton } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeleteSegmentButtonProps {
  segmentId: string;
  streamId: string;
  isLastSegment: boolean;
}

export default function DeleteSegmentButton({ 
  segmentId, 
  streamId,
  isLastSegment 
}: DeleteSegmentButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  if (!isLastSegment) {
    return null;
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce segment ? Cette action est irréversible.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/delete-segment?id=${encodeURIComponent(segmentId)}&streamId=${encodeURIComponent(streamId)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Recharger la page pour mettre à jour la liste
        router.refresh();
      } else {
        alert(data.error || 'Erreur lors de la suppression du segment');
      }
    } catch (error) {
      console.error('Error deleting segment:', error);
      alert('Erreur lors de la suppression du segment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <IconButton
      aria-label="Supprimer le segment"
      colorPalette="red"
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Supprimer ce segment (dernier créé)"
    >
      <Trash2 size={16} />
    </IconButton>
  );
}

