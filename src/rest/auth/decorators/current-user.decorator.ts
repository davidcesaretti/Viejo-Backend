import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserDocument } from '../../../repositories/user/user.schema';

export const CurrentUser = createParamDecorator(
  (
    data: keyof UserDocument | undefined,
    ctx: ExecutionContext,
  ): UserDocument | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDocument;
    return data ? user?.[data] : user;
  },
);
