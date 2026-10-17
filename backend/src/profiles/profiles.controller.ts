import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import { ProfilesService } from "./profiles.service.js";

@Controller("profiles")
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.getOwnProfile(user.id);
  }

  @Patch("me")
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ) {
    return this.profiles.updateOwnProfile(user.id, body.nome);
  }
}
