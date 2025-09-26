'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { HStack, Text } from '@chakra-ui/react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <HStack gap={2} fontSize="sm" color="fg.muted">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Home size={16} />
        <Text>Home</Text>
      </Link>
      
      {items.map((item, index) => (
        <HStack key={index} gap={2}>
          <ChevronRight size={16} />
          {item.href ? (
            <Link href={item.href}>
              <Text _hover={{ color: 'fg.default' }}>{item.label}</Text>
            </Link>
          ) : (
            <Text color="fg.default" fontWeight="medium">{item.label}</Text>
          )}
        </HStack>
      ))}
    </HStack>
  );
}
