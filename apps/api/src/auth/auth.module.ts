import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { TOKEN_DELIVERY, createDefaultTokenDelivery } from './token-delivery';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: TOKEN_DELIVERY,
      useFactory: createDefaultTokenDelivery,
    },
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
