'use client';

import { useTheme } from 'next-themes';
import { Button, HStack, Text } from '@chakra-ui/react';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

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