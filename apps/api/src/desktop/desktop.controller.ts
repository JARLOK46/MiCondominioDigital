import { Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { DesktopBootstrapInput } from './desktop-bootstrap.dto';
import { DesktopBootstrapService } from './desktop-bootstrap.service';

@Controller('desktop')
export class DesktopController {
  constructor(private readonly bootstrapService: DesktopBootstrapService) {}

  @Post('bootstrap')
  @UseGuards(AuthGuard)
  bootstrap(
    @Req() request: AuthenticatedRequest,
    @Body() body: Omit<DesktopBootstrapInput, 'tenantId' | 'userId'>,
  ) {
    const tenantId = request.tenantId;
    const userId = request.user?.sub;
    if (!tenantId || !userId || request.user?.tenantId !== tenantId) {
      throw new ForbiddenException('Authenticated tenant context is required');
    }
    return this.bootstrapService.bootstrap({ ...body, tenantId, userId });
  }
}
