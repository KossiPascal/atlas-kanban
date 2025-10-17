import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class AuthService {
    private auth: admin.auth.Auth;


    constructor(private readonly notifications: NotificationsService) {
        this.auth = admin.auth();
    }

    /** Vérifier un token Firebase envoyé par le frontend */
    async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
        try {
            return await this.auth.verifyIdToken(token);
        } catch (e) {
            throw new UnauthorizedException('Token invalide ou expiré');
        }
    }

    /** Créer un compte avec email + mot de passe */
    async signup(email: string, password: string, displayName?: string) {
        try {
            const user = await this.auth.createUser({ email, password, displayName });

            // Générer un lien de vérification
            const link = await this.auth.generateEmailVerificationLink(email);
            await this.notifications.sendEmail(email, 'Confirme ton compte', `Clique ici pour confirmer : ${link}`);

            return { uid: user.uid, email: user.email, displayName: user.displayName, message: 'Compte créé, vérifie ton email.' };
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                throw new BadRequestException('Email déjà utilisé');
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Login utilisateur (email + password)
     * Note : Firebase Admin SDK ne permet pas la vérification directe du mot de passe.
     * On recommande de générer un token custom ou d'utiliser Firebase Client SDK côté frontend.
     */
    async login(email: string, password: string) {
        try {
            const user = await this.auth.getUserByEmail(email);
            if (!user.emailVerified) throw new UnauthorizedException('Email non vérifié');

            const customToken = await this.auth.createCustomToken(user.uid);
            return { uid: user.uid, email: user.email, token: customToken };
        } catch (err) {
            throw new UnauthorizedException('Email ou mot de passe invalide');
        }
    }

    /**
     * Supprimer un utilisateur
     */
    async deleteUser(uid: string) {
        try {
            await this.auth.deleteUser(uid);
            return { uid };
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                throw new NotFoundException('Utilisateur non trouvé');
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Récupérer les infos utilisateur
     */
    async getUser(uid: string) {
        try {
            const user = await this.auth.getUser(uid);
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                phoneNumber: user.phoneNumber,
                customClaims: user.customClaims,
                metadata: user.metadata,
            };
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                throw new NotFoundException('Utilisateur non trouvé');
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Mettre à jour un utilisateur
     */
    async updateUser(uid: string, data: Partial<{ email: string; password: string; displayName: string; phoneNumber: string; customClaims: any }>) {
        try {
            const updatedUser = await this.auth.updateUser(uid, data);
            if (data.customClaims) {
                await this.auth.setCustomUserClaims(uid, data.customClaims);
            }
            return updatedUser;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                throw new NotFoundException('Utilisateur non trouvé');
            }
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Lister tous les utilisateurs (avec pagination)
     */
    async listUsers(limit = 1000, nextPageToken?: string) {
        try {
            const list = await this.auth.listUsers(limit, nextPageToken);
            return {
                users: list.users.map(u => ({
                    uid: u.uid,
                    email: u.email,
                    displayName: u.displayName,
                    phoneNumber: u.phoneNumber,
                    customClaims: u.customClaims,
                    metadata: u.metadata,
                })),
                nextPageToken: list.pageToken,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Générer un token custom Firebase pour un utilisateur
     */
    async createCustomToken(uid: string, claims?: Record<string, any>) {
        try {
            return await this.auth.createCustomToken(uid, claims);
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }
}
