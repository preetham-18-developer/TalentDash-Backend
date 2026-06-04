import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>(
        'GOOGLE_CLIENT_ID',
        'placeholder-google-client-id',
      ),
      clientSecret: configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
        'placeholder-google-client-secret',
      ),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3001/v1/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, name, emails, photos } = profile;
    const email = emails && emails.length > 0 ? emails[0].value : '';
    const avatar_url = photos && photos.length > 0 ? photos[0].value : null;
    const givenName = name?.givenName || '';
    const familyName = name?.familyName || '';
    const fullName = `${givenName} ${familyName}`.trim() || email.split('@')[0];

    const user = {
      provider: 'GOOGLE',
      provider_id: id,
      email,
      name: fullName,
      avatar_url,
    };
    done(null, user);
  }
}
