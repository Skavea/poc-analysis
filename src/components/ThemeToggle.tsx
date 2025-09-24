'use client';

import { useTheme } from 'next-themes';
import { Button, HStack, Text } from '@chakra-ui/react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  // Add client-side only rendering to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Only show the UI after mounting on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={16} />;
      case 'dark':
        return <Moon size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'System';
    }
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        _hover={{ bg: 'bg.subtle' }}
      >
        <HStack gap={2}>
          <div style={{ width: '16px', height: '16px' }} />
          <Text fontSize="sm" display={{ base: 'none', md: 'block' }}>
            Theme
          </Text>
        </HStack>
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={cycleTheme}
      _hover={{
        bg: 'bg.subtle',
      }}
    >
      <HStack gap={2}>
        {getIcon()}
        <Text fontSize="sm" display={{ base: 'none', md: 'block' }}>
          {getLabel()}
        </Text>
      </HStack>
    </Button>
  );
}