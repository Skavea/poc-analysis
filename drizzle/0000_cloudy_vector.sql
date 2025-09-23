CREATE TABLE "analysis_results" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"date" varchar(10) NOT NULL,
	"segment_start" timestamp with time zone NOT NULL,
	"segment_end" timestamp with time zone NOT NULL,
	"point_count" integer NOT NULL,
	"x0" numeric(12, 4) NOT NULL,
	"min_price" numeric(12, 4) NOT NULL,
	"max_price" numeric(12, 4) NOT NULL,
	"average_price" numeric(12, 4) NOT NULL,
	"trend_direction" varchar(10) NOT NULL,
	"schema_type" varchar(20) DEFAULT 'UNCLASSIFIED' NOT NULL,
	"points_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trend_direction_check" CHECK ("analysis_results"."trend_direction" IN ('UP', 'DOWN')),
	CONSTRAINT "schema_type_check" CHECK ("analysis_results"."schema_type" IN ('R', 'V', 'UNCLASSIFIED')),
	CONSTRAINT "point_count_check" CHECK ("analysis_results"."point_count" >= 6),
	CONSTRAINT "price_check" CHECK ("analysis_results"."min_price" <= "analysis_results"."average_price" AND "analysis_results"."average_price" <= "analysis_results"."max_price"),
	CONSTRAINT "segment_time_check" CHECK ("analysis_results"."segment_start" < "analysis_results"."segment_end")
);
--> statement-breakpoint
CREATE TABLE "stock_data" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"date" varchar(10) NOT NULL,
	"data" jsonb NOT NULL,
	"total_points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
