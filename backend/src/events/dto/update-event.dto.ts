import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  Matches,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateEventDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  @IsOptional()
  startDate?: string;

  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  @IsOptional()
  endDate?: string;

  @IsUUID()
  @IsOptional()
  locationId?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsIn(['PUBLISHED'])
  @IsOptional()
  status?: 'PUBLISHED';
}
