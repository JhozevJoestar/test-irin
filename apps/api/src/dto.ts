import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class LoginDto {
  @ApiProperty({ example: 'admin@demo.local' })
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ format: 'password', maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
export class FiltersDto {
  @ApiPropertyOptional({ example: 'company-a' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  companyId?: string;
  @ApiPropertyOptional({ example: 'branch-1' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  branchId?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
export class SyncDto {
  @ApiProperty({ example: 'branch-1' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  branchId!: string;
  @ApiProperty({ format: 'date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;
  @ApiProperty({ format: 'date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
}
