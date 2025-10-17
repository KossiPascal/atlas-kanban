import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';
import { ENV } from 'src/env';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = ENV;

@Injectable()
export class EmailService {
  private auth: admin.auth.Auth;
  private transporter;

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(), // ou JSON key
      });
    }
    this.auth = admin.auth();

    // this.transporter = nodemailer.createTransport({
    //   host: SMTP_HOST || 'smtp.gmail.com',
    //   port: parseInt(SMTP_PORT || '587'),
    //   secure: SMTP_PORT === '465', // true pour 465, false pour 587
    //   auth: {
    //     user: SMTP_USER,
    //     pass: SMTP_PASS, // mot de passe d’application Gmail
    //   },
    // });


    this.transporter = nodemailer.createTransport({
      sendmail: true, // 👉 pas de compte requis
      newline: 'unix',
      path: '/usr/sbin/sendmail',
    });
  }

  /** Envoie un mail de vérification Firebase avec contenu custom */
  async sendCustomVerificationEmail(email: string) {
    if (!email) throw new Error('Email invalide');

    // Génère le lien Firebase
    const link = await this.auth.generateEmailVerificationLink(email, {
      url: 'http://localhost:3000/auth/verify-email',
    });

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width:600px; margin:auto;">
        <h2 style="color:#4CAF50;">Bienvenue sur TonApp !</h2>
        <p>Merci de vous être inscrit. Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail :</p>
        <a href="${link}" style="
            display:inline-block;
            padding:12px 24px;
            background-color:#4CAF50;
            color:#fff;
            border-radius:6px;
            text-decoration:none;
            font-weight:bold;
            margin-top:10px;
        ">Vérifier mon e-mail</a>
        <p>Si vous n'avez pas créé de compte, ignorez ce message.</p>
        <hr>
        <p style="font-size:12px; color:#999;">© ${new Date().getFullYear()} TonApp</p>
      </div>
    `;

    console.log('ZZZZZZZZZZZZZZZZZZZZ')

    await this.transporter.sendMail({
      from: 'noreply@atlas-kanban-857d0.firebaseapp.com',//SMTP_FROM || SMTP_USER,
      to: email,
      subject: 'Vérifiez votre adresse e-mail',
      html: htmlMessage,
    });

    console.log(`[EmailService] Email envoyé à ${email}`);
  }
}
















// import { Injectable } from '@nestjs/common';
// import * as nodemailer from 'nodemailer';
// import * as admin from 'firebase-admin';
// import { ENV } from 'src/env';


// const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = ENV;


// @Injectable()
// export class EmailService {
//     private auth: admin.auth.Auth;
//     private transporter;

//     constructor() {
//             this.auth = admin.auth();

//         console.log({ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM })

//         this.transporter = nodemailer.createTransport({
//             host: SMTP_HOST || 'smtp.gmail.com', // ou SendGrid, SMTP pro
//             port: parseInt(SMTP_PORT || '465'),
//             secure: true,
//             auth: {
//                 user: SMTP_USER,
//                 pass: SMTP_PASS,
//             },
//         });
//     }



//     async sendCustomVerificationEmail(uid: string) {
//         // const user = await this.firebaseAdmin.auth().getUser(uid);

//         const email = 'kossi.tsolegnagbo@ism.edu.sn'//user.email
//         // if (!user.email) throw new Error('Utilisateur sans email');

//         const link = await this.auth.generateEmailVerificationLink(email, {
//                 url: 'http://localhost:3000/verify-email',
//             });

//         const htmlMessage = `
//             <div style="font-family: Arial, sans-serif; color: #333;">
//                 <h2>Bienvenue sur <span style="color:#4CAF50;">TonApp</span> !</h2>
//                 <p>Merci de vous être inscrit. Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail :</p>
//                 <a href="${link}" style="
//                     display:inline-block;
//                     padding:10px 20px;
//                     background-color:#4CAF50;
//                     color:#fff;
//                     border-radius:5px;
//                     text-decoration:none;
//                     ">Vérifier mon e-mail</a>
//                 <p>Si vous n'avez pas créé de compte, ignorez ce message.</p>
//                 <p style="font-size:12px;color:#999;">© ${new Date().getFullYear()} TonApp</p>
//             </div>
//             `;


//         await this.transporter.sendMail({
//             // from: `"TonApp Support" <${SMTP_USER}>`,
//             from: SMTP_USER,
//             to: email,
//             subject: 'Vérifiez votre adresse e-mail',
//             html: htmlMessage,
//         });
//     }
// }
