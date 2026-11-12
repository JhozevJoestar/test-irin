import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Req,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthRequest } from './auth.guard';
import { AnalyticsService } from './analytics.service';
import { IntegrationsService } from './integrations.service';
import { FiltersDto, SyncDto } from './dto';
@UseGuards(AuthGuard)
@Controller()
export class DataController {
  constructor(
    private analytics: AnalyticsService,
    private integrations: IntegrationsService,
  ) {}
  @Get('companies') companies(@Req() req: AuthRequest) {
    return this.analytics.companies(req.user);
  }
  @Get('branches') branches(
    @Req() req: AuthRequest,
    @Query() query: FiltersDto,
  ) {
    return this.analytics.branches(req.user, query);
  }
  @Get('branches/:id') branch(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.analytics.branch(req.user, id);
  }
  @Get('analytics/summary') summary(
    @Req() req: AuthRequest,
    @Query() query: FiltersDto,
  ) {
    return this.analytics.summary(req.user, query);
  }
  @Get('analytics/timeseries') timeseries(
    @Req() req: AuthRequest,
    @Query() query: FiltersDto,
  ) {
    return this.analytics.timeseries(req.user, query);
  }
  @Post('integrations/sync') sync(
    @Req() req: AuthRequest,
    @Body() input: SyncDto,
  ) {
    return this.integrations.sync(req.user, input);
  }
}
