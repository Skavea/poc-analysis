/**
 * Toast Notification System
 * ========================
 * 
 * Custom toast implementation using Chakra UI v3
 * Provides user feedback for actions
 */

'use client';

import { useState, useEffect } from 'react';
import { Box, HStack, Text, Button, Icon } from '@chakra-ui/react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: 'green',
  error: 'red',
  warning: 'orange',
  info: 'blue',
};

export function Toast({ id, type, title, description, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const IconComponent = toastIcons[type];
  const colorPalette = toastColors[type];

  if (!isVisible) return null;

  return (
    <Box
      className="animate-slide-in-right"
      p={4}
      bg="bg.default"
      border="1px"
      borderColor="border.default"
      rounded="lg"
      shadow="lg"
      minW="320px"
      maxW="400px"
    >
      <HStack gap={3} align="start">
        <Box
          p={1}
          bg={`${colorPalette}.50`}
          rounded="md"
          color={`${colorPalette}.600`}
        >
          <IconComponent size={20} />
        </Box>
        
        <Box flex={1}>
          <Text fontSize="sm" fontWeight="semibold" color="fg.default">
            {title}
          </Text>
          {description && (
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {description}
            </Text>
          )}
        </Box>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onClose(id)}
          p={1}
          minW="auto"
          h="auto"
        >
          <X size={16} />
        </Button>
      </HStack>
    </Box>
  );
}

// Toast Manager Hook
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    // Use timestamp + counter for consistent IDs
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: removeToast,
    };
    
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <Box
      position="fixed"
      top={4}
      right={4}
      zIndex={1000}
      className="animate-slide-in-right"
    >
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </Box>
  );

  return {
    addToast,
    removeToast,
    ToastContainer,
  };
}
