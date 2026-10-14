import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { DesktopBootstrapService } from './desktop-bootstrap.service';
import { DesktopController } from './desktop.controller';

@Module({ imports: [EntitlementsModule], controllers: [DesktopController], providers: [DesktopBootstrapService], exports: [DesktopBootstrapService] })
export class DesktopModule {}
