import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserDocument } from '../../../repositories/user/user.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: UserDocument }>();
    if (!user?.roles?.length) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Se requiere uno de estos roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
