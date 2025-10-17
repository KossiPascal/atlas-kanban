import { Controller, Post, Body, Headers, Get, Param, Put, Delete, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { EmailService } from 'src/services/email.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly emailService: EmailService) { }



  @Post('send-verification')
  async sendVerification(@Body() body: { uid: 'user.uid' }) {
    try {
      console.log(body)
      await this.emailService.sendCustomVerificationEmail(body.uid);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }


  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  async me(@Headers('authorization') authHeader: string) {
    const token = authHeader?.split('Bearer ')[1];
    return this.authService.verifyToken(token);
  }

  /**
   * Créer un compte utilisateur (email + password)
   */
  @Post('signup')
  async signup(@Body() body: { email: string; password: string; displayName?: string }) {
    const { email, password, displayName } = body;
    if (!email || !password) throw new UnauthorizedException('Email et mot de passe requis');
    return this.authService.signup(email, password, displayName);
  }

  /**
   * Vérifier un token Firebase
   */
  @Post('verify')
  async verify(@Headers('authorization') authHeader: string) {
    if (!authHeader) throw new UnauthorizedException('Header Authorization manquant');
    const token = authHeader.split('Bearer ')[1];
    if (!token) throw new UnauthorizedException('Token manquant');
    return this.authService.verifyToken(token);
  }

  /**
   * Login utilisateur (génère un custom token)
   */
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    if (!email || !password) throw new UnauthorizedException('Email et mot de passe requis');
    return this.authService.login(email, password);
  }

  /**
   * Récupérer les infos de l'utilisateur
   */
  @UseGuards(FirebaseAuthGuard)
  @Get('profile/:uid')
  async getProfile(@Param('uid') uid: string) {
    return this.authService.getUser(uid);
  }

  /**
   * Mettre à jour un utilisateur
   */
  @UseGuards(FirebaseAuthGuard)
  @Put('update/:uid')
  async updateUser(
    @Param('uid') uid: string,
    @Body() body: Partial<{ email: string; password: string; displayName: string; phoneNumber: string; customClaims: any }>,
  ) {
    return this.authService.updateUser(uid, body);
  }

  /**
   * Supprimer un utilisateur
   */
  @UseGuards(FirebaseAuthGuard)
  @Delete('delete/:uid')
  async deleteUser(@Param('uid') uid: string) {
    return this.authService.deleteUser(uid);
  }

  /**
   * Lister tous les utilisateurs (admin)
   */
  @UseGuards(FirebaseAuthGuard)
  @Get('list')
  async listUsers(@Query('limit') limit?: number, @Query('nextPageToken') nextPageToken?: string) {
    const pageLimit = limit ? Number(limit) : 1000;
    return this.authService.listUsers(pageLimit, nextPageToken);
  }

  /**
   * Générer un token custom pour un utilisateur
   */
  @UseGuards(FirebaseAuthGuard)
  @Post('custom-token/:uid')
  async createCustomToken(@Param('uid') uid: string, @Body() body?: { claims?: Record<string, any> }) {
    return this.authService.createCustomToken(uid, body?.claims);
  }
}
