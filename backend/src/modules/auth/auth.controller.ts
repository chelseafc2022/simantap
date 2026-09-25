import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterUserDto } from './dto/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login akun ASN via NIP / Email dan Password',
    description: 'Mengembalikan Access Token (JWT 15m) dan Refresh Token (7d) untuk wrapper refresh token frontend.',
  })
  @ApiResponse({ status: 200, description: 'Login berhasil' })
  @ApiResponse({ status: 401, description: 'Kredensial tidak valid' })
  login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    const userAgent = req.get('user-agent');
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Access Token menggunakan Refresh Token',
    description: 'Mendukung rotasi token otomatis pada wrapper TanStack Query / Axios frontend.',
  })
  @ApiResponse({ status: 200, description: 'Token berhasil diperbarui' })
  @ApiResponse({ status: 401, description: 'Refresh token tidak valid atau kedaluwarsa' })
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout akun dan mencabut seluruh refresh token aktif' })
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Mendapatkan data profil dan hak akses pengguna yang sedang login' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @ApiBearerAuth()
  @Roles(RoleEnum.ADMINISTRATOR)
  @Post('register')
  @ApiOperation({ summary: 'Pendaftaran akun baru (Khusus Role Administrator)' })
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }
}
