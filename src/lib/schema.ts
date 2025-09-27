/**
 * Database Schema
 * ===============
 * 
 * DrizzleORM schema definitions for type-safe database operations
 */

import { pgTable, varchar, integer, decimal, timestamp, jsonb, check, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Stock Data Table
export const stockData = pgTable('stock_data', {
  id: varchar('id', { length: 255 }).primaryKey(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  data: jsonb('data').notNull(),
  totalPoints: integer('total_points').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Analysis Results Table
export const analysisResults = pgTable('analysis_results', {
  id: varchar('id', { length: 255 }).primaryKey(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  segmentStart: timestamp('segment_start', { withTimezone: true }).notNull(),
  segmentEnd: timestamp('segment_end', { withTimezone: true }).notNull(),
  pointCount: integer('point_count').notNull(),
  x0: decimal('x0', { precision: 12, scale: 4 }).notNull(),
  minPrice: decimal('min_price', { precision: 12, scale: 4 }).notNull(),
  maxPrice: decimal('max_price', { precision: 12, scale: 4 }).notNull(),
  averagePrice: decimal('average_price', { precision: 12, scale: 4 }).notNull(),
  trendDirection: varchar('trend_direction', { length: 10 }).notNull(),
  schemaType: varchar('schema_type', { length: 20 }).default('UNCLASSIFIED').notNull(),
  patternPoint: varchar('pattern_point', { length: 255 }), // Timestamp du point sélectionné ou null
  pointsData: jsonb('points_data'),
  originalPointCount: integer('original_point_count'),
  pointsInRegion: integer('points_in_region'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  trendDirectionCheck: check('trend_direction_check', sql`${table.trendDirection} IN ('UP', 'DOWN')`),
  schemaTypeCheck: check('schema_type_check', sql`${table.schemaType} IN ('R', 'V', 'UNCLASSIFIED')`),
  pointCountCheck: check('point_count_check', sql`${table.pointCount} >= 6`),
  priceCheck: check('price_check', sql`${table.minPrice} <= ${table.averagePrice} AND ${table.averagePrice} <= ${table.maxPrice}`),
  segmentTimeCheck: check('segment_time_check', sql`${table.segmentStart} < ${table.segmentEnd}`),
}));

// Zod schemas for validation
export const insertStockDataSchema = createInsertSchema(stockData);
export const selectStockDataSchema = createSelectSchema(stockData);

export const insertAnalysisResultSchema = createInsertSchema(analysisResults);
export const selectAnalysisResultSchema = createSelectSchema(analysisResults);

// Type exports
export type StockData = typeof stockData.$inferSelect;
export type NewStockData = typeof stockData.$inferInsert;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type NewAnalysisResult = typeof analysisResults.$inferInsert;

// Custom types for API responses
export interface StockDataWithPoints extends StockData {
  data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface AnalysisResultWithChart extends AnalysisResult {
  pointsData: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

// Chart Images Table
export const chartImages = pgTable('chart_images', {
  id: varchar('id', { length: 255 }).primaryKey(),
  segmentId: varchar('segment_id', { length: 255 }).notNull().references(() => analysisResults.id),
  svgContent: text('svg_content').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  format: varchar('format', { length: 10 }).notNull().default('svg'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Zod schemas for validation
export const insertChartImageSchema = createInsertSchema(chartImages);
export const selectChartImageSchema = createSelectSchema(chartImages);

// Type exports for chart images
export type ChartImage = typeof chartImages.$inferSelect;
export type NewChartImage = typeof chartImages.$inferInsert;

// Validation schemas
export const schemaTypeSchema = z.enum(['R', 'V', 'UNCLASSIFIED']);
export const trendDirectionSchema = z.enum(['UP', 'DOWN']);
export const chartFormatSchema = z.enum(['svg', 'png']);
