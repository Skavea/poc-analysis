/**
 * Navigation Component
 * ===================
 * 
 * Professional navbar with progressive disclosure and proper visual hierarchy
 */

'use client';

import {
  Box,
  Flex,
  HStack,
  Text,
  Heading,
  Container,
} from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
// We're implementing our own inline breadcrumb
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavigationProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  pageTitle?: string;
  pageSubtitle?: string;
  pageActions?: React.ReactNode;
}

export default function Navigation({ children, breadcrumbs, pageTitle, pageSubtitle, pageActions }: NavigationProps) {
  // Responsive adjustments
  
  return (
    <Box minH="100vh" bg="bg.canvas">
      {/* Primary Navbar - Always visible */}
      <Box
        as="header"
        bg="bg.default"
        borderBottom="1px"
        borderColor="border.default"
        position="sticky"
        top={0}
        zIndex={10}
        boxShadow="sm"
      >
        <Container maxW="7xl" px={{ base: 4, md: 6 }}>
          {/* Logo and App Title */}

          {/* Main Navigation Bar */}
          <Flex h="64px" align="center" justify="space-between">
            <div className="flex items-center justify-start">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Flex
                  py={2}
                  fontSize="sm"
                  color="fg.muted"
                  borderBottom="1px"
                  borderColor="border.subtle"
                >
                  <Link
                    href="/"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    Home
                  </Link>
                  {breadcrumbs.map((item, index) => (
                    <HStack key={index} gap={1}>
                      <ChevronRight size={14} />
                      {item.href ? (
                        <Link href={item.href}>
                          <Text _hover={{ color: "fg.default" }}>
                            {item.label}
                          </Text>
                        </Link>
                      ) : (
                        <Text color="fg.default" fontWeight="medium">
                          {item.label}
                        </Text>
                      )}
                    </HStack>
                  ))}
                </Flex>
              )}
              
            </div>
            {/* Right Side Actions */}
            <ThemeToggle />
          </Flex>

          {/* Breadcrumb Navigation */}
        </Container>
      </Box>

      {/* Page Header - Conditionally shown */}
      {(pageTitle || pageSubtitle || pageActions) && (
        <Box
          bg="bg.default"
          borderBottom="1px"
          borderColor="border.default"
          py={4}
          mb={6}
        >
          <Container maxW="7xl" px={{ base: 4, md: 6 }}>
            <Flex
              align="center"
              justify="space-between"
              flexDir={{ base: "column", md: "row" }}
              gap={{ base: 4, md: 0 }}
            >
              {/* Page Title and Subtitle */}
              <Box>
                {pageTitle && (
                  <Heading size="lg" color="fg.default" lineHeight="tight">
                    {pageTitle}
                  </Heading>
                )}
                {pageSubtitle && (
                  <Text color="fg.muted" fontSize="md" mt={1}>
                    {pageSubtitle}
                  </Text>
                )}
              </Box>

              {/* Page Actions */}
              {pageActions && <Box ml={{ md: "auto" }}>{pageActions}</Box>}
            </Flex>
          </Container>
        </Box>
      )}

      {/* Page Content */}
      <Container
        maxW="7xl"
        px={{ base: 4, md: 6 }}
        pb={12}
        pt={!pageTitle && !pageSubtitle ? 6 : 0}
      >
        {children}
      </Container>
    </Box>
  );
}
