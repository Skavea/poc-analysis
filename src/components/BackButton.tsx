'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  href?: string;
  label?: string;
}

export default function BackButton({ href, label = 'Back' }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <Button
      colorPalette="blue"
      variant="outline"
      size="md"
      onClick={handleClick}
      leftIcon={<ArrowLeft size={16} />}
      fontWeight="medium"
      px={4}
    >
      {label}
    </Button>
  );
}
