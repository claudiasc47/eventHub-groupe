import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email!: string;

    @MinLength(8)
    password!: string;

    @Length(3, 30)
    pseudo!: string;

    @IsOptional() @IsString()
    firstName?: string;

    @IsOptional() @IsString()
    lastName?: string;

    @IsOptional() @IsString()
    phone?: string;

    @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
    birthDate?: string;
}