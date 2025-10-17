// src/users/users.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { FIREBASE_ADMIN } from '../firebase-admin.providers';
import * as admin from 'firebase-admin';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerIds: string[];
  creationTime: string;
  lastSignInTime: string;
  color?: string; // <-- ajouter couleur
}
@Injectable()
export class UsersService {
  constructor(@Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: admin.app.App) {}

  private COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#facc15'];

  private assignUniqueColors(users: AppUser[]): AppUser[] {
    const usedColors = new Set<string>();
    return users.map(user => {
      let color: string;

      // Tirer une couleur disponible dans la palette
      const availableColors = this.COLORS.filter(c => !usedColors.has(c));

      if (availableColors.length > 0) {
        color = availableColors[Math.floor(Math.random() * availableColors.length)];
      } else {
        // Palette épuisée → générer une couleur aléatoire
        color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
      }

      usedColors.add(color);
      return { ...user, color };
    });
  }

  async listAllUsers(maxResults = 1000): Promise<AppUser[]> {
    const auth = admin.auth(this.firebaseAdmin);
    const listUsersResult = await auth.listUsers(maxResults);

    const allUsers = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      providerIds: userRecord.providerData.map((p) => p.providerId),
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    }));

    // Fusionner par email
    const mergedUsers: Record<string, AppUser> = {};
    for (const user of allUsers) {
      if (!user.email) continue;
      if (!mergedUsers[user.email]) (mergedUsers as any)[user.email] = { ...user };
      else mergedUsers[user.email].providerIds = Array.from(
        new Set([...mergedUsers[user.email].providerIds, ...user.providerIds])
      );
    }

    // Assigner couleur unique
    return this.assignUniqueColors(Object.values(mergedUsers));
  }
}
