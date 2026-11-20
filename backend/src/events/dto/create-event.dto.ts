import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  startDate!: string;

  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  endDate!: string;

  @IsUUID()
  locationId!: string;

  @IsUUID()
  categoryId!: string;

  @IsUUID()
  organizerId!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}
